import './load-env';
import { prisma } from '../lib/prisma';
import { publishMessage, createKafkaConsumer, getKafka } from '../lib/pipeline/kafkaClient';
import { savePayload, loadPayload, getPayloadUri } from '../lib/pipeline/objectStore';
import { NODE_HANDLERS, topologicalSort, mergePipelineData, resolveSessionId, PipelineData, ExecutionContext } from '../lib/pipeline/executor';
import { logger } from '../lib/logger';
import { executeExtraction } from '../lib/queue/executor';

const role = process.env.KAFKA_WORKER_ROLE || 'worker';
const consumerGroupId = process.env.KAFKA_CONSUMER_GROUP_ID || `hackmanite-group-${role}`;
const jobTopicsEnv = process.env.KAFKA_WORKER_TOPICS || 'pipeline-transforms,pipeline-nlp,pipeline-exports,document-extraction';
const jobTopics = jobTopicsEnv.split(',').map((t) => t.trim());

// Helper to determine the target job topic for a node
function getTargetTopicForNode(node: any): string {
  const type = node.data?.type || node.type || '';
  if (type.startsWith('source.file.document') || type.startsWith('source.file.email') || type.startsWith('source.web.scraper')) {
    return 'pipeline-nlp';
  }
  if (type.startsWith('output.')) {
    return 'pipeline-exports';
  }
  return 'pipeline-transforms';
}

function isNodeDisabled(node: any): boolean {
  return !!(node.data?.disabled ?? node.disabled);
}

function outputHandlesFor(node: any): { id: string }[] {
  return node.data?.outputs?.length ? node.data.outputs : [{ id: 'output' }];
}

function formatDaemonLog(level: 'INFO' | 'ERROR', label: string, message: string): string {
  return `[${new Date().toLocaleTimeString()}][${level}][${label}] ${message}`;
}

async function ensureTopicsExist(topics: string[]) {
  const kafka = getKafka();
  const admin = kafka.admin();
  try {
    await admin.connect();
    const existingTopics = await admin.listTopics();
    const topicsToCreate = topics.filter((t) => !existingTopics.includes(t));
    if (topicsToCreate.length > 0) {
      logger.info('Creating missing Kafka topics...', { topicsToCreate });
      await admin.createTopics({
        topics: topicsToCreate.map((t) => ({ topic: t })),
        waitForLeaders: true,
      });
      logger.info('Kafka topics created successfully.');
    }
  } catch (err: any) {
    logger.warn('Failed to check/create Kafka topics', { error: err.message });
  } finally {
    try {
      await admin.disconnect();
    } catch {}
  }
}

async function runCoordinator() {
  logger.info('Starting Kafka Pipeline Coordinator...');

  await ensureTopicsExist(['pipeline-start', 'pipeline-status', 'pipeline-nlp', 'pipeline-transforms', 'pipeline-exports', 'document-extraction']);

  const startConsumer = createKafkaConsumer(`${consumerGroupId}-start`);
  const statusConsumer = createKafkaConsumer(`${consumerGroupId}-status`);

  await startConsumer.connect();
  await statusConsumer.connect();

  await startConsumer.subscribe({ topic: 'pipeline-start', fromBeginning: false });
  await statusConsumer.subscribe({ topic: 'pipeline-status', fromBeginning: false });

  // In-memory active runs tracking
  interface RunState {
    pipelineRunId: string;
    sessionId?: string;
    nodes: any[];
    edges: any[];
    nodeStates: Record<string, { state: 'idle' | 'running' | 'success' | 'error'; error?: string }>;
    completedNodes: Set<string>;
    logs: string[];
  }

  const activeRuns = new Map<string, RunState>();

  // Helper to load or reconstruct run state from database (resilience on restart)
  async function getOrCreateRunState(runId: string, passedSessionId?: string): Promise<RunState | null> {
    if (activeRuns.has(runId)) {
      return activeRuns.get(runId)!;
    }

    const run = await prisma.pipelineRun.findUnique({
      where: { id: runId },
      include: { pipeline: true },
    });
    if (!run) return null;

    const definition = JSON.parse(run.pipeline.definition);
    const nodes = definition.nodes || [];
    const edges = definition.edges || [];
    const dbStates = run.nodeStates ? JSON.parse(run.nodeStates) : {};
    
    const completed = new Set<string>();
    for (const nodeId of Object.keys(dbStates)) {
      if (dbStates[nodeId]?.state === 'success') {
        completed.add(nodeId);
      }
    }

    const state: RunState = {
      pipelineRunId: runId,
      sessionId: resolveSessionId(nodes) || passedSessionId,
      nodes,
      edges,
      nodeStates: dbStates,
      completedNodes: completed,
      logs: run.logs ? run.logs.split('\n') : [],
    };

    activeRuns.set(runId, state);
    return state;
  }

  async function updateDatabase(state: RunState) {
    await prisma.pipelineRun.update({
      where: { id: state.pipelineRunId },
      data: {
        nodeStates: JSON.stringify(state.nodeStates),
        logs: state.logs.join('\n'),
      },
    });
  }

  // Schedule a node for execution by posting a job message to the appropriate topic
  async function scheduleNode(state: RunState, nodeId: string) {
    const node = state.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    state.nodeStates[nodeId] = { state: 'running' };
    state.logs.push(formatDaemonLog('INFO', node.data?.label || nodeId, `Dispatching node to worker...`));
    await updateDatabase(state);

    // Build the input mapping for this node
    // inputHandleId -> Array of { sourceNodeId, sourceOutputId }
    const inputMappings: Record<string, { sourceNodeId: string; sourceOutputId: string }[]> = {};
    for (const input of node.data?.inputs || []) {
      const mappings: { sourceNodeId: string; sourceOutputId: string }[] = [];
      for (const edge of state.edges) {
        if (edge.target === nodeId && (edge.targetHandle === input.id || (!edge.targetHandle && node.data?.inputs?.length === 1))) {
          const upstreamNode = state.nodes.find((n) => n.id === edge.source);
          const upstreamOutputs = upstreamNode?.data?.outputs || [];
          mappings.push({
            sourceNodeId: edge.source,
            sourceOutputId: edge.sourceHandle || upstreamOutputs[0]?.id || 'output',
          });
        }
      }
      inputMappings[input.id] = mappings;
    }

    const targetTopic = getTargetTopicForNode(node);
    await publishMessage(targetTopic, {
      runId: state.pipelineRunId,
      sessionId: state.sessionId,
      node,
      inputMappings,
    });
  }

  // Consume from pipeline-start
  startConsumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const payload = JSON.parse(message.value.toString());
        const { pipelineRunId, sessionId } = payload;
        
        logger.info(`Coordinator received pipeline-start for run: ${pipelineRunId}`);
        const run = await prisma.pipelineRun.findUnique({
          where: { id: pipelineRunId },
          include: { pipeline: true },
        });
        if (!run) throw new Error(`Run record ${pipelineRunId} not found`);

        await prisma.pipelineRun.update({
          where: { id: pipelineRunId },
          data: { status: 'RUNNING', startedAt: new Date() },
        });

        const state = await getOrCreateRunState(pipelineRunId, sessionId);
        if (!state) return;

        state.logs.push(formatDaemonLog('INFO', 'System', `Starting pipeline execution via Kafka: "${run.pipeline.name}"`));
        for (const node of state.nodes) {
          state.nodeStates[node.id] = { state: 'idle' };
        }

        // Validate graph
        try {
          topologicalSort(state.nodes, state.edges);
        } catch (err: any) {
          throw new Error(`Cycle check failed: ${err.message}`);
        }

        // Find root nodes (nodes with no incoming edges)
        const rootNodes = state.nodes.filter(
          (node) => !state.edges.some((edge) => edge.target === node.id)
        );

        if (rootNodes.length === 0 && state.nodes.length > 0) {
          throw new Error('No entry/root nodes found in pipeline definition.');
        }

        await updateDatabase(state);

        // Schedule all root nodes
        for (const root of rootNodes) {
          await scheduleNode(state, root.id);
        }
      } catch (err: any) {
        logger.error('Failed to initialize pipeline run in coordinator', { error: err.message });
      }
    },
  });

  // Consume status updates from workers
  statusConsumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString());
        const { type, runId, nodeId, level, message: logMsg, status, error } = event;

        const state = await getOrCreateRunState(runId);
        if (!state) return;

        const node = state.nodes.find((n) => n.id === nodeId);
        const nodeLabel = node?.data?.label || nodeId;

        if (type === 'log') {
          state.logs.push(formatDaemonLog(level || 'INFO', nodeLabel, logMsg || ''));
          await updateDatabase(state);
        } else if (type === 'node_status') {
          if (status === 'success') {
            state.nodeStates[nodeId] = { state: 'success' };
            state.completedNodes.add(nodeId);
            state.logs.push(formatDaemonLog('INFO', nodeLabel, 'Finished successfully.'));
            await updateDatabase(state);

            // Find downstream children and check if their dependencies are fully satisfied
            const children = state.nodes.filter((n) =>
              state.edges.some((edge) => edge.source === nodeId && edge.target === n.id)
            );

            for (const child of children) {
              const childState = state.nodeStates[child.id]?.state;
              if (childState === 'running' || childState === 'success') continue;

              // Check if all parent inputs are successfully completed
              const parentEdges = state.edges.filter((edge) => edge.target === child.id);
              const allParentsDone = parentEdges.every((edge) => state.completedNodes.has(edge.source));

              if (allParentsDone) {
                await scheduleNode(state, child.id);
              }
            }

            // Check if all nodes are complete
            const allComplete = state.nodes.every((n) => state.completedNodes.has(n.id));
            if (allComplete) {
              await prisma.pipelineRun.update({
                where: { id: runId },
                data: { status: 'COMPLETED', completedAt: new Date() },
              });
              state.logs.push(formatDaemonLog('INFO', 'System', 'Pipeline execution completed successfully!'));
              await updateDatabase(state);
              activeRuns.delete(runId);
            }
          } else if (status === 'failure') {
            state.nodeStates[nodeId] = { state: 'error', error: error || 'Worker error' };
            state.logs.push(formatDaemonLog('ERROR', nodeLabel, `Failed with error: ${error || 'Unknown error'}`));
            
            await prisma.pipelineRun.update({
              where: { id: runId },
              data: { status: 'FAILED', error: error || 'Worker execution failed', completedAt: new Date() },
            });
            await updateDatabase(state);
            activeRuns.delete(runId);
          }
        }
      } catch (err: any) {
        logger.error('Failed to process status update in coordinator', { error: err.message });
      }
    },
  });
}

async function runWorker() {
  logger.info(`Starting Kafka Pipeline Worker consuming from: ${jobTopics.join(', ')}`);

  await ensureTopicsExist(jobTopics);

  const jobConsumer = createKafkaConsumer(consumerGroupId);
  await jobConsumer.connect();

  for (const topic of jobTopics) {
    await jobConsumer.subscribe({ topic, fromBeginning: false });
  }

  jobConsumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      
      if (topic === 'document-extraction') {
        const payload = JSON.parse(message.value.toString());
        logger.info(`Worker picked up document extraction task for file: ${payload.fileId}`);
        const controller = new AbortController();
        try {
          await executeExtraction(`kafka-${payload.fileId}`, payload, controller);
        } catch (err: any) {
          logger.error(`Document extraction failed inside worker for file ${payload.fileId}: ${err.message}`);
        }
        return;
      }

      const payload = JSON.parse(message.value.toString());
      const { runId, sessionId, node, inputMappings } = payload;
      const nodeId = node.id;
      const nodeLabel = node.data?.label || nodeId;

      logger.info(`Worker picked up task: [${nodeLabel}] (${node.data?.type}) for run: ${runId}`);

      const context: ExecutionContext = {
        runId,
        sessionId,
        async log(msg: string) {
          await publishMessage('pipeline-status', {
            type: 'log',
            runId,
            nodeId,
            level: 'INFO',
            message: msg,
          });
        },
        async updateNodeState() {}, // Handled by coordinator
      };

      try {
        // 1. Resolve inputs
        const resolvedInputs: Record<string, PipelineData> = {};
        for (const inputHandleId of Object.keys(inputMappings || {})) {
          const mappings = inputMappings[inputHandleId];
          const parentPayloads: PipelineData[] = [];
          
          for (const mapping of mappings) {
            const uri = getPayloadUri(runId, mapping.sourceNodeId, mapping.sourceOutputId);
            const parentData = await loadPayload(uri);
            if (parentData) {
              parentPayloads.push(parentData);
            }
          }

          if (parentPayloads.length > 0) {
            resolvedInputs[inputHandleId] = mergePipelineData(parentPayloads);
          }
        }

        // 2. Check if disabled (bypass)
        if (isNodeDisabled(node)) {
          await context.log('Node is deactivated; bypassing and passing through inputs.');
          const inputsList = Object.values(resolvedInputs);
          if (inputsList.length > 0) {
            const merged = mergePipelineData(inputsList);
            for (const out of outputHandlesFor(node)) {
              await savePayload(runId, nodeId, out.id, merged);
            }
          }
          await publishMessage('pipeline-status', {
            type: 'node_status',
            runId,
            nodeId,
            status: 'success',
          });
          return;
        }

        // 3. Find and run handler
        const handler = NODE_HANDLERS[node.data?.type || node.type];
        if (!handler) {
          throw new Error(`Handler for node type "${node.data?.type || node.type}" is not registered.`);
        }

        const result = await handler.run(resolvedInputs, node.data?.config || {}, context);

        // 4. Save output payload
        if (result) {
          for (const out of outputHandlesFor(node)) {
            await savePayload(runId, nodeId, out.id, result);
          }
        }

        // 5. Publish success
        await publishMessage('pipeline-status', {
          type: 'node_status',
          runId,
          nodeId,
          status: 'success',
        });
      } catch (err: any) {
        const errorMsg = err.message || String(err);
        logger.error(`Error executing node [${nodeLabel}]`, { error: errorMsg });
        
        await publishMessage('pipeline-status', {
          type: 'node_status',
          runId,
          nodeId,
          status: 'failure',
          error: errorMsg,
        });
      }
    },
  });
}

// Entrypoint routing
if (role === 'coordinator') {
  runCoordinator().catch((err) => {
    logger.error('Pipeline Coordinator failed catastrophically', { error: err.message });
    process.exit(1);
  });
} else {
  runWorker().catch((err) => {
    logger.error('Pipeline Worker failed catastrophically', { error: err.message });
    process.exit(1);
  });
}
