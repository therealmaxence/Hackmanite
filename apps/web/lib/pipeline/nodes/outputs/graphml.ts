import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { buildDownloadResult, ensureExtension, resolveExportPath } from './shared';
import { buildGraphML } from '@/lib/graphml';
import { writeFile } from 'fs/promises';

export const graphmlOutputHandler: NodeHandler = {
  type: 'output.graphml',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const fileName = config?.fileName || `export_${Date.now()}.graphml`;
    const finalFileName = ensureExtension(fileName, '.graphml');
    await context.log(`Generating GraphML XML for: ${finalFileName}`);
    const xml = buildGraphML(input);

    const { absolutePath, relativePath } = await resolveExportPath(finalFileName, config, context);
    await writeFile(absolutePath, xml, 'utf8');
    await context.log(`Successfully wrote GraphML output to: ${relativePath}`);
    return buildDownloadResult(finalFileName, xml, 'application/xml', relativePath);
  },
};
