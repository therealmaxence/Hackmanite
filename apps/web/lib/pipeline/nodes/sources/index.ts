import { sqliteQueryHandler } from './sqlite.query';
import { kuzuDbQueryHandler } from './kuzudb.query';
import { sessionSourceHandler } from './session';
import { documentSourceHandler } from './file.document';
import { emailSourceHandler } from './file.email';
import { csvSourceHandler } from './csv';
import { webScraperHandler } from './scraper';

export const handlers = [
  sqliteQueryHandler,
  kuzuDbQueryHandler,
  sessionSourceHandler,
  documentSourceHandler,
  emailSourceHandler,
  csvSourceHandler,
  webScraperHandler,
];
