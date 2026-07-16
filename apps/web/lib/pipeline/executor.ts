import { prisma } from '@/lib/prisma';
import { registerAllNodes } from './nodes';
import { logger } from '@/lib/logger';

export interface TabularData { type: 'tabular'; data: any[]; }
export interface GraphData { type: 'graph'; nodes: any[]; edges: any[]; emails?: any[]; }
export interface FileDownloadData { type: 'file_download'; value: { fileName: string; content: string; mimeType: string; isBase64?: boolean; relativePath?: string }; }
export type PipelineData = TabularData | GraphData | FileDownloadData;

export interface ExecutionContext {
  runId: string;
  isDryRun?: boolean;
  sessionId?: string;
  log(message: string): Promise<void>;
  updateNodeState(nodeId: string, state: 'idle' | 'running' | 'success' | 'error', error?: string): Promise<void>;
}

export interface NodeHandler {
  type: string;
  run(inputs: Record<string, PipelineData>, config: any, context: ExecutionContext): Promise<PipelineData | void>;
}

export const NODE_HANDLERS: Record<string, NodeHandler> = {};
export function registerNodeHandler(handler: NodeHandler) { NODE_HANDLERS[handler.type] = handler; }
registerAllNodes();

export function topologicalSort(nodes: any[], edges: any[]): string[] {
  const adj: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  for (const node of nodes) { adj[node.id] = []; inDegree[node.id] = 0; }
  for (const edge of edges) if (adj[edge.source] !== undefined && adj[edge.target] !== undefined) { adj[edge.source].push(edge.target); inDegree[edge.target] = (inDegree[edge.target] || 0) + 1; }
  const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const order: string[] = [];
  for (let index = 0; index < queue.length; index++) {
    const nodeId = queue[index];
    order.push(nodeId);
    for (const next of adj[nodeId]) if (--inDegree[next] === 0) queue.push(next);
  }
  if (order.length !== nodes.length) throw new Error('Cycle detected in pipeline graph');
  return order;
}

export function resolveSessionId(nodes: any[]): string | undefined {
  const sessionNode = nodes.find((n: any) => (n.data?.type || n.type) === 'source.session');
  return sessionNode?.data?.config?.sessionId || sessionNode?.config?.sessionId;
}

function buildNodeIndex(nodes: any[]) { return new Map(nodes.map((node) => [node.id, node] as const)); }

function findUpstreamOutputs(nodeId: string, input: any, nodeById: Map<string, any>, edges: any[], intermediateOutputs: Record<string, PipelineData>): PipelineData[] {
  const inputCount = nodeById.get(nodeId)?.data?.inputs?.length || 0;
  return edges.flatMap((edge: any) => {
    if (edge.target !== nodeId || (edge.targetHandle !== input.id && (edge.targetHandle || inputCount !== 1))) return [];
    const upstreamOutputs = nodeById.get(edge.source)?.data?.outputs || [];
    const outputVal = intermediateOutputs[`${edge.source}.${edge.sourceHandle || upstreamOutputs[0]?.id || 'output'}`];
    return outputVal ? [outputVal] : [];
  });
}

export function mergePipelineData(outputs: PipelineData[]): PipelineData {
  if (outputs.length === 0) throw new Error('Cannot merge empty outputs list');
  if (outputs.length === 1) return outputs[0];

  const first = outputs[0];
  if (first.type === 'graph') {
    const allNodes: any[] = [];
    const allEdges: any[] = [];
    const allEmails: any[] = [];
    for (const out of outputs) {
      if (out.type !== 'graph') throw new Error(`Cannot merge input of type "${out.type}" with "graph"`);
      allNodes.push(...(out.nodes || []));
      allEdges.push(...(out.edges || []));
      allEmails.push(...(out.emails || []));
    }
    const uniqueNodes: Record<string, any> = {};
    for (const node of allNodes) {
      if (!node || !node.id) continue;
      if (uniqueNodes[node.id]) {
        if (node.occurrences && uniqueNodes[node.id].occurrences) uniqueNodes[node.id].occurrences.push(...node.occurrences);
        else if (node.occurrences) uniqueNodes[node.id].occurrences = [...node.occurrences];
      } else {
        uniqueNodes[node.id] = { ...node };
        if (node.occurrences) uniqueNodes[node.id].occurrences = [...node.occurrences];
      }
    }
    const uniqueEdges: Record<string, any> = {};
    for (const edge of allEdges) {
      if (!edge || !edge.source || !edge.target) continue;
      const key = `${edge.fileId || ''}:${edge.source}->${edge.target}`;
      if (uniqueEdges[key]) {
        if (typeof uniqueEdges[key].weight === 'number' && typeof edge.weight === 'number') uniqueEdges[key].weight = (uniqueEdges[key].weight + edge.weight) / 2;
      } else {
        uniqueEdges[key] = { ...edge };
      }
    }
    const uniqueEmails = Array.from(new Map(allEmails.filter(Boolean).map((email) => [email.id || email.fileId, email])).values());
    return { type: 'graph', nodes: Object.values(uniqueNodes), edges: Object.values(uniqueEdges), emails: uniqueEmails.length > 0 ? uniqueEmails : undefined };
  }
  if (first.type === 'tabular') {
    const data: any[] = [];
    for (const out of outputs) {
      if (out.type !== 'tabular') throw new Error(`Cannot merge input of type "${out.type}" with "tabular"`);
      data.push(...(out.data || []));
    }
    return { type: 'tabular', data };
  }
  if (first.type === 'file_download') return outputs[outputs.length - 1];
  return first;
}

function computeGraphTfidf(graph: any) {
  if (!graph || graph.type !== 'graph' || !Array.isArray(graph.nodes)) return;
  const uniqueFiles = new Set<string>();
  for (const node of graph.nodes) {
    for (const occ of Array.isArray(node.occurrences) ? node.occurrences : []) {
      const key = occ.fileName || occ.fileId;
      if (key) uniqueFiles.add(key);
    }
  }
  const N = uniqueFiles.size || 1;
  for (const node of graph.nodes) {
    if (Array.isArray(node.occurrences) && node.occurrences.length > 0) {
      const df = new Set(node.occurrences.map((o: any) => o.fileName || o.fileId).filter(Boolean)).size || 1;
      const idf = Math.log(N / df) + 1.0;
      let totalTfidf = 0;
      for (const occ of node.occurrences) {
        const occTfidf = (occ.count || 1) * idf;
        occ.tfidf = occTfidf;
        totalTfidf += occTfidf;
      }
      node.tfidf = totalTfidf;
    } else {
      node.tfidf = node.tfidf ?? 0;
    }
  }
}

function outputHandlesFor(node: any): { id: string }[] { return node.data.outputs?.length ? node.data.outputs : [{ id: 'output' }]; }
function isNodeDisabled(node: any): boolean { return !!(node.data?.disabled ?? node.disabled); }
function formatPipelineLog(level: 'INFO' | 'ERROR', message: string): string { return `[${new Date().toLocaleTimeString()}][${level}] ${message}`; }

async function runNode(node: any, nodeById: Map<string, any>, edges: any[], intermediateOutputs: Record<string, PipelineData>, context: ExecutionContext): Promise<void> {
  const inputs: Record<string, PipelineData> = {};
  for (const input of node.data.inputs || []) {
    const upstreamOutputs = findUpstreamOutputs(node.id, input, nodeById, edges, intermediateOutputs);
    if (upstreamOutputs.length > 0) {
      const merged = mergePipelineData(upstreamOutputs);
      if (merged.type === 'graph') computeGraphTfidf(merged);
      inputs[input.id] = merged;
    }
  }

  if (isNodeDisabled(node)) {
    const passthrough = Object.values(inputs);
    if (passthrough.length > 0) {
      const result = mergePipelineData(passthrough);
      for (const out of outputHandlesFor(node)) intermediateOutputs[`${node.id}.${out.id}`] = result;
    }
    await context.log(`Node [${node.data.label}] is deactivated; bypassed without changing the pipeline data.`);
    return;
  }

  const handler = NODE_HANDLERS[node.data.type];
  if (!handler) throw new Error(`Handler for node type "${node.data.type}" is not registered.`);

  const result = await handler.run(inputs, node.data.config, context);
  if (!result) return;
  if (result.type === 'graph') computeGraphTfidf(result);
  for (const out of outputHandlesFor(node)) intermediateOutputs[`${node.id}.${out.id}`] = result;
}

export async function executePipeline(runId: string, activeSessionId?: string): Promise<void> {
  const run = await prisma.pipelineRun.findUnique({ where: { id: runId }, include: { pipeline: true } });
  if (!run) throw new Error(`Pipeline run record not found for ID: ${runId}`);

  await prisma.pipelineRun.update({ where: { id: runId }, data: { status: 'RUNNING', startedAt: new Date() } });

  const definition = JSON.parse(run.pipeline.definition);
  const nodes = definition.nodes || [];
  const edges = definition.edges || [];
  const nodeById = buildNodeIndex(nodes);
  const sessionId = resolveSessionId(nodes) || activeSessionId;
  const logsList: string[] = [];
  const nodeStatesMap: Record<string, { state: 'idle' | 'running' | 'success' | 'error'; error?: string }> = {};

  const context: ExecutionContext = {
    runId,
    sessionId,
    async log(msg) {
      logsList.push(formatPipelineLog('INFO', msg));
      logger.info(`[PipelineRun ${runId}] ${msg}`);
      await prisma.pipelineRun.update({ where: { id: runId }, data: { logs: logsList.join('\n') } });
    },
    async updateNodeState(nodeId, state, error) {
      nodeStatesMap[nodeId] = { state, error };
      await prisma.pipelineRun.update({ where: { id: runId }, data: { nodeStates: JSON.stringify(nodeStatesMap) } });
    },
  };

  try {
    await context.log(`Starting pipeline execution for: "${run.pipeline.name}"`);
    for (const node of nodes) await context.updateNodeState(node.id, 'idle');

    let order: string[];
    try {
      order = topologicalSort(nodes, edges);
      await context.log('Graph topological sort completed successfully. No cycles detected.');
    } catch (err: any) {
      throw new Error(`Topological Sort Failed: ${err.message}`);
    }

    const intermediateOutputs: Record<string, PipelineData> = {};
    for (const nodeId of order) {
      const node = nodeById.get(nodeId);
      if (!node) continue;
      await context.updateNodeState(nodeId, 'running');
      await context.log(`Running node: [${node.data.label}] (${node.data.type})`);
      try {
        await runNode(node, nodeById, edges, intermediateOutputs, context);
        await context.updateNodeState(nodeId, 'success');
        await context.log(`Node [${node.data.label}] finished successfully.`);
      } catch (err: any) {
        const errMsg = err.message || String(err);
        await context.updateNodeState(nodeId, 'error', errMsg);
        await context.log(`Node [${node.data.label}] failed with error: ${errMsg}`);
        throw err;
      }
    }

    await prisma.pipelineRun.update({ where: { id: runId }, data: { status: 'COMPLETED', completedAt: new Date() } });
    await context.log('Pipeline run finished successfully!');
  } catch (err: any) {
    const finalError = err.message || String(err);
    await prisma.pipelineRun.update({ where: { id: runId }, data: { status: 'FAILED', error: finalError, completedAt: new Date() } });
    logsList.push(formatPipelineLog('ERROR', `Pipeline run aborted due to error: ${finalError}`));
    await prisma.pipelineRun.update({ where: { id: runId }, data: { logs: logsList.join('\n') } });
  }
}

export async function executePipelineDryRun(pipelineId: string, nodeId: string): Promise<PipelineData> {
  const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId } });
  if (!pipeline) throw new Error(`Pipeline not found for ID: ${pipelineId}`);

  const definition = JSON.parse(pipeline.definition);
  const nodes = definition.nodes || [];
  const edges = definition.edges || [];
  const nodeById = buildNodeIndex(nodes);
  const targetNode = nodeById.get(nodeId);
  if (!targetNode) throw new Error(`Target node "${nodeId}" not found in pipeline`);

  const visited = new Set<string>([nodeId]);
  const queue = [nodeId];
  for (let index = 0; index < queue.length; index++) {
    const curr = queue[index];
    for (const edge of edges) {
      if (edge.target === curr && !visited.has(edge.source)) {
        visited.add(edge.source);
        queue.push(edge.source);
      }
    }
  }

  const trimmedNodes = nodes.filter((node: any) => visited.has(node.id));
  const trimmedEdges = edges.filter((edge: any) => visited.has(edge.source) && visited.has(edge.target));
  const order = topologicalSort(trimmedNodes, trimmedEdges);
  const sessionId = resolveSessionId(nodes);

  const context: ExecutionContext = {
    runId: `dryrun_${Date.now()}`,
    isDryRun: true,
    sessionId,
    async log(msg) { logger.debug(`[DryRun ${nodeId}] ${msg}`); },
    async updateNodeState(nid, state, error) { logger.debug(`[DryRun NodeState ${nid}] ${state}${error ? ` (${error})` : ''}`); },
  };

  const intermediateOutputs: Record<string, PipelineData> = {};
  for (const currId of order) {
    const node = nodeById.get(currId);
    if (!node) continue;
    await runNode(node, nodeById, trimmedEdges, intermediateOutputs, context);
  }

  const primaryOutputHandle = outputHandlesFor(targetNode)[0].id;
  const finalResult = intermediateOutputs[`${nodeId}.${primaryOutputHandle}`];
  if (!finalResult) throw new Error(`Target node "${nodeId}" did not produce any output on handle "${primaryOutputHandle}"`);
  return finalResult;
}
