import { NodeHandler } from '../executor';
import { UPLOAD_DIR } from '@/lib/api/upload';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const handler: NodeHandler = {
  type: 'output.json',
  async run(inputs, config, context) {
    const input = inputs.input;
    if (!input) {
      throw new Error('Input port "input" is missing');
    }

    const fileName = config?.fileName || `export_${Date.now()}.json`;
    await context.log(`Serializing input to JSON file: ${fileName}`);

    const exportPath = join(UPLOAD_DIR, 'exports', fileName);
    const absoluteExportPath = join(process.cwd(), exportPath);

    await mkdir(join(process.cwd(), UPLOAD_DIR, 'exports'), { recursive: true });
    await writeFile(absoluteExportPath, JSON.stringify(input, null, 2));

    await context.log(`Successfully wrote JSON output to: ${exportPath}`);
  },
};
