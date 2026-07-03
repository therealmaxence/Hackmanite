import { jsonOutputHandler } from './json';
import { graphmlOutputHandler } from './graphml';
import { obsidianVaultOutputHandler } from './obsidian_vault';
import { aiReportOutputHandler } from './ai_report';
import { kuzuDbWriteHandler } from './kuzudb_write';

export const handlers = [jsonOutputHandler, graphmlOutputHandler, obsidianVaultOutputHandler, aiReportOutputHandler, kuzuDbWriteHandler];
