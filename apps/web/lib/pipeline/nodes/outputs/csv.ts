import { NodeHandler, PipelineData } from '../../executor';
import { requireInput } from '../shared';
import { buildDownloadResult, ensureExtension, resolveExportPath } from './shared';
import { writeFile } from 'fs/promises';

type CsvRow = Record<string, unknown>;

function scalar(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

function cell(value: unknown): string {
  const text = scalar(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToCsv(rows: CsvRow[], headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))): string {
  if (headers.length === 0) return '';
  return [headers.map(cell).join(','), ...rows.map((row) => headers.map((header) => cell(row[header])).join(','))].join('\n');
}

function occurrenceSummary(node: any) {
  const occurrences = Array.isArray(node.occurrences) ? node.occurrences : [];
  const files = new Set(occurrences.map((occ: any) => occ.fileName || occ.fileId).filter(Boolean));
  return {
    occurrenceCount: occurrences.reduce((sum: number, occ: any) => sum + (Number(occ.count) || 0), 0),
    fileCount: files.size,
  };
}

function graphRows(input: Extract<PipelineData, { type: 'graph' }>): CsvRow[] {
  const nodeRows = (input.nodes || []).map((node: any) => ({
    recordType: 'node',
    id: node.id || '',
    label: node.label || node.displayName || '',
    entityType: node.type || '',
    canonical: node.canonical || '',
    tfidf: node.tfidf ?? '',
    ...occurrenceSummary(node),
    source: '',
    target: '',
    weight: '',
    distance: '',
    snippet: '',
    metadata: node.metadata || '',
  }));
  const edgeRows = (input.edges || []).map((edge: any, index: number) => ({
    recordType: 'edge',
    id: edge.id || `edge_${index}`,
    label: '',
    entityType: edge.type || '',
    canonical: '',
    tfidf: '',
    occurrenceCount: '',
    fileCount: '',
    source: edge.source || '',
    target: edge.target || '',
    weight: edge.weight ?? '',
    distance: edge.distance ?? '',
    snippet: edge.snippet || '',
    metadata: edge.metadata || '',
  }));
  return [...nodeRows, ...edgeRows];
}

function rowsFromInput(input: PipelineData): CsvRow[] {
  if (input.type === 'tabular') return (input.data || []).map((row) => row && typeof row === 'object' ? row : { value: row });
  if (input.type === 'graph') return graphRows(input);
  return [{
    fileName: input.value.fileName,
    mimeType: input.value.mimeType,
    relativePath: input.value.relativePath || '',
    isBase64: input.value.isBase64 || false,
    content: input.value.content,
  }];
}

export const csvOutputHandler: NodeHandler = {
  type: 'output.csv',
  async run(inputs, config, context) {
    const input = requireInput(inputs);
    const fileName = ensureExtension(config?.fileName || `export_${Date.now()}.csv`, '.csv');
    await context.log(`Serializing input to CSV file: ${fileName}`);

    const csv = rowsToCsv(rowsFromInput(input));
    const { absolutePath, relativePath } = await resolveExportPath(fileName, config, context);
    await writeFile(absolutePath, csv, 'utf8');
    await context.log(`Successfully wrote CSV output to: ${relativePath}`);
    return buildDownloadResult(fileName, csv, 'text/csv;charset=utf-8', relativePath);
  },
};
