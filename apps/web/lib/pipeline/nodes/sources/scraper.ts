import { NodeHandler } from '../../executor';
import { NLP_URL } from '@/lib/nlp-url';
import { uuid5 } from '@/lib/uuid5';
import { writeFile, rm } from 'fs/promises';
import { resolve } from 'path';
import { UPLOAD_DIR } from '@/lib/api/upload';

const USER_AGENTS: Record<string, string> = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chrome_mobile: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
  safari_iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/605.1.15'
};

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

function mergeNodesAndEdges(allNodes: any[], allEdges: any[]) {
  const uniqueNodes: Record<string, any> = {};
  for (const node of allNodes) {
    if (uniqueNodes[node.id]) {
      uniqueNodes[node.id].occurrences.push(...node.occurrences);
    } else {
      uniqueNodes[node.id] = { ...node };
    }
  }

  const uniqueEdges: Record<string, any> = {};
  for (const edge of allEdges) {
    const key = `${edge.fileId || ''}:${edge.source}->${edge.target}`;
    if (uniqueEdges[key]) {
      uniqueEdges[key].weight = (uniqueEdges[key].weight + edge.weight) / 2;
    } else {
      uniqueEdges[key] = { ...edge };
    }
  }

  return { nodes: Object.values(uniqueNodes), edges: Object.values(uniqueEdges) };
}

export const webScraperHandler: NodeHandler = {
  type: 'source.web.scraper',
  async run(_, config, context) {
    const rawUrl = config?.url;
    if (!rawUrl) throw new Error('Missing parameter: url');

    const urls = String(rawUrl).split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) throw new Error('No valid URLs provided.');

    const browserType = config?.browserType || 'default';
    const stealthMode = !!config?.stealthMode;
    const headersJson = config?.headersJson || '';

    const headers: Record<string, string> = {};
    if (browserType !== 'default' && USER_AGENTS[browserType]) {
      headers['User-Agent'] = USER_AGENTS[browserType];
    }
    if (stealthMode) {
      if (!headers['User-Agent']) headers['User-Agent'] = USER_AGENTS.chrome;
      headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8';
      headers['Accept-Language'] = 'en-US,en;q=0.9,fr;q=0.8';
      headers['Referer'] = 'https://www.google.com/';
      headers['Upgrade-Insecure-Requests'] = '1';
    }
    if (headersJson) {
      try {
        Object.assign(headers, JSON.parse(headersJson));
      } catch {
        throw new Error('Invalid JSON in custom headers parameter');
      }
    }

    await context.log(`Starting scraper for ${urls.length} URL(s)...`);
    const allNodes: any[] = [];
    const allEdges: any[] = [];

    for (const url of urls) {
      await context.log(`Fetching contents from URL: ${url}`);
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch URL: status ${res.status}`);
        const content = await res.text();

        const isRss = url.endsWith('.xml') || url.includes('/feed') || content.includes('<rss') || content.includes('<feed');
        const text = isRss ? parseRss(content) : stripHtml(content);
        if (!text) {
          await context.log(`Warning: URL ${url} returned no readable text.`);
          continue;
        }

        const fileId = `scrape-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const fileName = url.split('/').pop() || 'scraped-page.txt';
        const mime = 'text/plain';
        const tempPath = resolve(UPLOAD_DIR, `${fileId}.txt`);

        await writeFile(tempPath, text, 'utf8');

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

          const urlNodes = (result.entities || []).map((entity: any) => {
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

          const urlEdges = (result.neighborhoods || []).map((nb: any) => ({
            source: uuid5(`${nb.source_type}:${nb.source_canonical.slice(0, 500)}`),
            target: uuid5(`${nb.target_type}:${nb.target_canonical.slice(0, 500)}`),
            weight: nb.weight,
            distance: nb.distance,
            snippet: nb.snippet,
            fileId,
            fileName,
          }));

          allNodes.push(...urlNodes);
          allEdges.push(...urlEdges);
          await context.log(`URL ${url} processed: extracted ${urlNodes.length} nodes and ${urlEdges.length} edges.`);
        } finally {
          await rm(tempPath, { force: true });
        }
      } catch (err: any) {
        await context.log(`Error processing URL ${url}: ${err.message || err}`);
      }
    }

    const merged = mergeNodesAndEdges(allNodes, allEdges);
    await context.log(`Scraper complete: extracted ${merged.nodes.length} nodes and ${merged.edges.length} edges across ${urls.length} URLs.`);
    return { type: 'graph', nodes: merged.nodes, edges: merged.edges };
  }
};
