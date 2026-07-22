import { NodeHandler } from '../../executor';
import { readPipelineTextFile } from './shared';

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
    const delimiter = config?.delimiter || ',';
    const { content: fileContent } = await readPipelineTextFile(config, context, 'CSV');
    const data = parseCsv(fileContent, delimiter);
    await context.log(`Successfully parsed CSV with ${data.length} records.`);
    return { type: 'tabular', data };
  },
};
