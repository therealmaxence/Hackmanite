import { NodeHandler } from '../../executor';
import { NLP_URL } from '@/lib/nlp-url';
import { uuid5 } from '@/lib/uuid5';
import { writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

function stripHtml(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"');
  return text.replace(/\s+/g, ' ').trim();
}

function parseRss(xml: string): string {
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  let text = '';
  for (const match of matches) {
    const itemContent = match[1];
    const title = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || '';
    const desc = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] || '';
    text += `${title}\n${desc}\n\n`;
  }
  return stripHtml(text);
}

export const webScraperHandler: NodeHandler = {
  type: 'source.web.scraper',
  async run(_, config, context) {
    const url = config?.url;
    if (!url) throw new Error('Missing parameter: url');

    await context.log('[WARNING] Scraping external URL makes direct network requests from the server IP address (leaving a trace on the internet).');
    await context.log(`Fetching contents from URL: ${url}`);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch URL: status ${res.status}`);
    const content = await res.text();

    const isRss = url.endsWith('.xml') || url.includes('/feed') || content.includes('<rss') || content.includes('<feed');
    const text = isRss ? parseRss(content) : stripHtml(content);

    if (!text) throw new Error('Scraped document contains no readable text.');

    const tempPath = join(tmpdir(), `scrape_${Date.now()}.txt`);
    await writeFile(tempPath, text, 'utf8');

    const fileId = `scrape-${Date.now()}`;
    const fileName = url.split('/').pop() || 'scraped-page.txt';
    const mime = 'text/plain';

    await context.log(`Running NLP entity extraction on scraped text (${text.length} characters)...`);
    try {
      const nlpRes = await fetch(`${NLP_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          storage_path: tempPath,
          mime_type: mime,
          window_size: 400,
          persist: false,
        }),
      });

      if (!nlpRes.ok) throw new Error(`NLP Service error: ${nlpRes.statusText}`);
      const result = await nlpRes.json();
      if (result.error) throw new Error(`NLP Service returned error: ${result.error}`);

      const nodes = (result.entities || []).map((entity: any) => {
        const canonical = entity.canonical.slice(0, 500);
        return {
          id: uuid5(`${entity.type}:${canonical}`),
          label: entity.display_name,
          type: entity.type,
          canonical,
          metadata: entity.metadata ? JSON.stringify(entity.metadata) : '{}',
          occurrences: [{ fileId, fileName, mimeType: mime, count: entity.count, excerpts: entity.excerpts ? JSON.stringify(entity.excerpts) : '[]' }],
        };
      });

      const edges = (result.neighborhoods || []).map((nb: any) => ({
        source: uuid5(`${nb.source_type}:${nb.source_canonical.slice(0, 500)}`),
        target: uuid5(`${nb.target_type}:${nb.target_canonical.slice(0, 500)}`),
        weight: nb.weight,
        distance: nb.distance,
        snippet: nb.snippet,
        fileId,
        fileName,
      }));

      await context.log(`NLP Extraction finished: extracted ${nodes.length} nodes and ${edges.length} edges.`);
      return { type: 'graph', nodes, edges };
    } finally {
      await rm(tempPath, { force: true });
    }
  },
};
