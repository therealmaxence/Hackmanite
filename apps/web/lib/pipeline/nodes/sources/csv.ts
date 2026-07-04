import { NodeHandler } from '../../executor';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

function parseCsv(content: string, delimiter = ','): any[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];
  const splitLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  const headers = splitLine(lines[0]);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    const obj: any = {};
    headers.forEach((header, idx) => {
      obj[header] = values[idx] || '';
    });
    data.push(obj);
  }
  return data;
}

export const csvSourceHandler: NodeHandler = {
  type: 'source.file.csv',
  async run(_, config, context) {
    const filePath = config?.filePath;
    const configuredFileIds = Array.isArray(config?.fileIds) ? config.fileIds.filter(Boolean).map(String) : [];
    const delimiter = config?.delimiter || ',';
    let fileContent = '';

    if (configuredFileIds.length > 0) {
      const dbFile = await prisma.file.findFirst({ where: { id: configuredFileIds[0] } });
      if (!dbFile) throw new Error(`CSV file not found in session: ${configuredFileIds[0]}`);
      const absolutePath = resolve(process.cwd(), dbFile.storagePath);
      await context.log(`Reading CSV from session uploads: ${dbFile.originalName}`);
      fileContent = await readFile(absolutePath, 'utf8');
    } else {
      if (!filePath) throw new Error('Missing parameter: filePath or fileIds');
      const absolutePath = resolve(process.cwd(), filePath);
      if (!existsSync(absolutePath)) throw new Error(`Path does not exist: ${filePath}`);
      await context.log(`Reading CSV from local disk: ${filePath}`);
      fileContent = await readFile(absolutePath, 'utf8');
    }

    const data = parseCsv(fileContent, delimiter);
    await context.log(`Successfully parsed CSV with ${data.length} records.`);
    return { type: 'tabular', data };
  },
};
