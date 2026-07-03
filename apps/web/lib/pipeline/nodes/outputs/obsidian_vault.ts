import { NodeHandler } from '../../executor';
import { requireGraphInput } from '../shared';
import { buildDownloadResult, ensureExtension, resolveExportPath } from './shared';
import { buildObsidianZip } from '../../obsidianBuilder';
import { writeFile } from 'fs/promises';

export const obsidianVaultOutputHandler: NodeHandler = {
  type: 'output.obsidian_vault',
  async run(inputs, config, context) {
    const input = requireGraphInput(inputs);
    const zipName = config?.zipName || `obsidian_${Date.now()}.zip`;
    const finalZipName = ensureExtension(zipName, '.zip');
    await context.log(`Building Obsidian vault ZIP file: ${finalZipName}`);

    const buffer = await buildObsidianZip(input).generateAsync({ type: 'nodebuffer' });
    const { absolutePath, relativePath } = await resolveExportPath(finalZipName, config, context);
    await writeFile(absolutePath, buffer);
    await context.log(`Successfully wrote Obsidian vault to: ${relativePath}`);
    return buildDownloadResult(finalZipName, buffer.toString('base64'), 'application/zip', relativePath, true);
  },
};
