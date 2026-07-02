import { prisma } from '@/lib/prisma';
import { registerAllNodes } from './nodes';

// ─── Pipeline Data Types ─────────────────────────────────────────────────────

export interface TabularData {
  type: 'tabular';
  data: any[];
}

export interface GraphData {
  type: 'graph';
  nodes: any[];
  edges: any[];
  emails?: any[];
}

export type PipelineData = TabularData | GraphData;

export interface ExecutionContext {
  runId: string;
  isDryRun?: boolean;
  log(message: string): Promise<void>;
  updateNodeState(nodeId: string, state: 'idle' | 'running' | 'success' | 'error', error?: string): Promise<void>;
}

export interface NodeHandler {
  type: string;
  run(inputs: Record<string, PipelineData>, config: any, context: ExecutionContext): Promise<PipelineData | void>;
}

// ─── Registry of Node Handlers ───────────────────────────────────────────────

const NODE_HANDLERS: Record<string, NodeHandler> = {};

export function registerNodeHandler(handler: NodeHandler) {
  NODE_HANDLERS[handler.type] = handler;
}
// Register all modular node handlers dynamically
registerAllNodes();

// ─── Topological Sort Helper ────────────────────────────────────────────────

export function topologicalSort(nodes: any[], edges: any[]): string[] {
  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  for (const node of nodes) {
    adj[node.id] = [];
    inDegree[node.id] = 0;
  }

  for (const edge of edges) {
    if (adj[edge.source] !== undefined && adj[edge.target] !== undefined) {
      adj[edge.source].push(edge.target);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    }
  }

  const queue: string[] = [];
  for (const node of nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);

    for (const v of adj[u]) {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    }
  }

  if (order.length !== nodes.length) {
    throw new Error('Cycle detected in pipeline graph');
  }

  return order;
}

// ─── Core Executor Logic ─────────────────────────────────────────────────────

export async function executePipeline(runId: string): Promise<void> {
  const run = await prisma.pipelineRun.findUnique({
    where: { id: runId },
    include: { pipeline: true },
  });

  if (!run) {
    throw new Error(`Pipeline run record not found for ID: ${runId}`);
  }

  // Set status to RUNNING
  await prisma.pipelineRun.update({
    where: { id: runId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  const logsList: string[] = [];
  const nodeStatesMap: Record<string, { state: 'idle' | 'running' | 'success' | 'error'; error?: string }> = {};

  const context: ExecutionContext = {
    runId,
    async log(msg) {
      const timestamped = `[INFO] ${msg}`;
      logsList.push(timestamped);
      console.log(`[PipelineRun ${runId}] ${msg}`);
      await prisma.pipelineRun.update({
        where: { id: runId },
        data: { logs: logsList.join('\n') },
      });
    },
    async updateNodeState(nodeId, state, error) {
      nodeStatesMap[nodeId] = { state, error };
      await prisma.pipelineRun.update({
        where: { id: runId },
        data: { nodeStates: JSON.stringify(nodeStatesMap) },
      });
    },
  };

  try {
    await context.log(`Starting pipeline execution for: "${run.pipeline.name}"`);

    const definition = JSON.parse(run.pipeline.definition);
    const nodes = definition.nodes || [];
    const edges = definition.edges || [];

    // Initialize all node states to idle
    for (const node of nodes) {
      await context.updateNodeState(node.id, 'idle');
    }

    // Topological Sort
    let order: string[];
    try {
      order = topologicalSort(nodes, edges);
      await context.log('Graph topological sort completed successfully. No cycles detected.');
    } catch (err: any) {
      throw new Error(`Topological Sort Failed: ${err.message}`);
    }

    // Map to store intermediate outputs
    // Key is node_id + '.' + output_handle_id
    const intermediateOutputs: Record<string, PipelineData> = {};

    // Execute nodes sequentially
    for (const nodeId of order) {
      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node) continue;

      await context.updateNodeState(nodeId, 'running');
      await context.log(`Running node: [${node.data.label}] (${node.data.type})`);

      try {
        const handler = NODE_HANDLERS[node.data.type];
        if (!handler) {
          throw new Error(`Handler for node type "${node.data.type}" is not registered.`);
        }

        // Map inputs from upstream nodes
        const inputs: Record<string, PipelineData> = {};
        const nodeInputs = node.data.inputs || [];
        for (const input of nodeInputs) {
          // Find the edge leading to this input port
          const edge = edges.find((e: any) => e.target === nodeId && e.targetHandle === input.id);
          if (edge) {
            const outputKey = `${edge.source}.${edge.sourceHandle}`;
            const upstreamOutput = intermediateOutputs[outputKey];
            if (upstreamOutput) {
              inputs[input.id] = upstreamOutput;
            }
          }
        }

        // Run the node handler
        const result = await handler.run(inputs, node.data.config, context);

        // Store outputs
        if (result) {
          const nodeOutputs = node.data.outputs || [];
          for (const out of nodeOutputs) {
            // In basic case, we map output data to node.id + '.' + output_port_id
            const outputKey = `${nodeId}.${out.id}`;
            intermediateOutputs[outputKey] = result;
          }
        }

        await context.updateNodeState(nodeId, 'success');
        await context.log(`Node [${node.data.label}] finished successfully.`);
      } catch (err: any) {
        const errMsg = err.message || String(err);
        await context.updateNodeState(nodeId, 'error', errMsg);
        await context.log(`Node [${node.data.label}] failed with error: ${errMsg}`);
        throw err; // Halt the execution of the entire pipeline
      }
    }

    // Update status to COMPLETED
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await context.log('Pipeline run finished successfully!');
  } catch (err: any) {
    const finalError = err.message || String(err);
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: 'FAILED', error: finalError, completedAt: new Date() },
    });
    await context.log(`Pipeline run aborted due to error: ${finalError}`);
  }
}

export async function executePipelineDryRun(pipelineId: string, nodeId: string): Promise<PipelineData> {
  const pipeline = await prisma.pipeline.findUnique({
    where: { id: pipelineId },
  });

  if (!pipeline) {
    throw new Error(`Pipeline not found for ID: ${pipelineId}`);
  }

  const definition = JSON.parse(pipeline.definition);
  const nodes = definition.nodes || [];
  const edges = definition.edges || [];

  const targetNode = nodes.find((n: any) => n.id === nodeId);
  if (!targetNode) {
    throw new Error(`Target node "${nodeId}" not found in pipeline`);
  }

  // 1. Traverse backwards in DAG to find all dependency node IDs
  const visited = new Set<string>([nodeId]);
  const queue = [nodeId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const incomingEdges = edges.filter((e: any) => e.target === curr);
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  // 2. Filter nodes and edges to keep only dependencies
  const trimmedNodes = nodes.filter((n: any) => visited.has(n.id));
  const trimmedEdges = edges.filter((e: any) => visited.has(e.source) && visited.has(e.target));

  // 3. Topological Sort
  const order = topologicalSort(trimmedNodes, trimmedEdges);

  // 4. In-memory execution context (does not write to DB)
  const logsList: string[] = [];
  const context: ExecutionContext = {
    runId: `dryrun_${Date.now()}`,
    isDryRun: true,
    async log(msg) {
      logsList.push(msg);
      console.log(`[DryRun ${nodeId}] ${msg}`);
    },
    async updateNodeState(nid, state, error) {
      console.log(`[DryRun NodeState ${nid}] ${state} ${error ? `(${error})` : ''}`);
    },
  };

  const intermediateOutputs: Record<string, PipelineData> = {};

  // 5. Execute trimmed nodes in order
  for (const currId of order) {
    const node = trimmedNodes.find((n: any) => n.id === currId);
    if (!node) continue;

    const handler = NODE_HANDLERS[node.data.type];
    if (!handler) {
      throw new Error(`Handler for node type "${node.data.type}" is not registered.`);
    }

    const inputs: Record<string, PipelineData> = {};
    const nodeInputs = node.data.inputs || [];
    for (const input of nodeInputs) {
      const edge = trimmedEdges.find((e: any) => e.target === currId && e.targetHandle === input.id);
      if (edge) {
        const outputKey = `${edge.source}.${edge.sourceHandle}`;
        const upstreamOutput = intermediateOutputs[outputKey];
        if (upstreamOutput) {
          inputs[input.id] = upstreamOutput;
        }
      }
    }

    const result = await handler.run(inputs, node.data.config, context);

    if (result) {
      const nodeOutputs = node.data.outputs || [];
      for (const out of nodeOutputs) {
        const outputKey = `${currId}.${out.id}`;
        intermediateOutputs[outputKey] = result;
      }
    }
  }

  // 6. Return output of the target node
  const primaryOutputHandle = targetNode.data.outputs?.[0]?.id || 'output';
  const finalResult = intermediateOutputs[`${nodeId}.${primaryOutputHandle}`];
  if (!finalResult) {
    throw new Error(`Target node "${nodeId}" did not produce any output on handle "${primaryOutputHandle}"`);
  }

  return finalResult;
}

