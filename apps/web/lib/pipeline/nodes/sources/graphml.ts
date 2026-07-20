import { NodeHandler } from '../../executor';
import { parseGraphML } from '@/lib/graphml';
import { readPipelineTextFile } from './shared';

export const graphmlSourceHandler: NodeHandler = {
  type: 'source.file.graphml',
  async run(_, config, context) {
    const file = await readPipelineTextFile(config, context, 'GraphML');
    const graph = parseGraphML(file.content, {
      fileName: file.fileName,
      sourceFileId: file.fileId,
      mimeType: file.mimeType || 'application/graphml+xml',
    });
    await context.log(`Successfully parsed GraphML with ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
    return { type: 'graph', ...graph };
  },
};
