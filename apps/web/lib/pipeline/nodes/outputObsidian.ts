import { NodeHandler } from '../executor';
import { UPLOAD_DIR } from '@/lib/api/upload';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { buildObsidianZip } from '../obsidianBuilder';

export const handler: NodeHandler = {
  type: 'output.obsidian_vault',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input || input.type !== 'graph') {
      throw new Error('Input is missing or is not of type "graph"');
    }

    const zipName = config?.zipName || `obsidian_${Date.now()}.zip`;
    const finalZipName = zipName.endsWith('.zip') ? zipName : `${zipName}.zip`;
    await context.log(`Building Obsidian vault ZIP file: ${finalZipName}`);

    const zip = buildObsidianZip(input);
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    const exportPath = join(UPLOAD_DIR, 'exports', finalZipName);
    const absoluteExportPath = join(process.cwd(), exportPath);

    await mkdir(join(process.cwd(), UPLOAD_DIR, 'exports'), { recursive: true });
    await writeFile(absoluteExportPath, buffer);

    await context.log(`Successfully wrote Obsidian vault to: ${exportPath}`);
  },
};
