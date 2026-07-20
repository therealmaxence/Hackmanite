import { NodeHandler } from '../../executor';
import { buildSessionGraphExport } from '@/lib/sessionGraph';

export const sessionSourceHandler: NodeHandler = {
  type: 'source.session',
  async run(_, config, context) {
    const sessionId = config?.sessionId;
    if (!sessionId) throw new Error('Missing parameter: sessionId');
    await context.log(`Loading entity graph from session: ${sessionId}`);
    const graph = await buildSessionGraphExport(sessionId);
    await context.log(`Loaded session graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${graph.emails.length} emails.`);
    return { type: 'graph', nodes: graph.nodes, edges: graph.edges, emails: graph.emails };
  },
};
