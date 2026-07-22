import { jsonOutputHandler } from './json';
import { csvOutputHandler } from './csv';
import { graphmlOutputHandler } from './graphml';
import { obsidianVaultOutputHandler } from './obsidian_vault';
import { aiReportOutputHandler } from './ai_report';
import { kuzuDbWriteHandler } from './kuzudb_write';
import { htmlDashboardHandler } from './dashboard';

export const handlers = [
  jsonOutputHandler,
  csvOutputHandler,
  graphmlOutputHandler,
  obsidianVaultOutputHandler,
  aiReportOutputHandler,
  kuzuDbWriteHandler,
  htmlDashboardHandler,
];
