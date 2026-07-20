import { NodeHandler } from '../../executor';
import { requireInput } from '../shared';
import { buildDownloadResult, resolveExportPath } from './shared';
import { writeFile } from 'fs/promises';

export const jsonOutputHandler: NodeHandler = {
  type: 'output.json',
  async run(inputs, config, context) {
    const input = requireInput(inputs);
    const fileName = config?.fileName || `export_${Date.now()}.json`;
    await context.log(`Serializing input to JSON file: ${fileName}`);

    const { absolutePath, relativePath } = await resolveExportPath(fileName, config, context);
    const rawData = input.type === 'tabular' ? input.data : input.type === 'graph' ? { nodes: input.nodes, edges: input.edges } : input;
    const jsonString = JSON.stringify(rawData, null, 2);

    await writeFile(absolutePath, jsonString);
    await context.log(`Successfully wrote JSON output to: ${relativePath}`);
    return buildDownloadResult(fileName, jsonString, 'application/json', relativePath);
  },
};
