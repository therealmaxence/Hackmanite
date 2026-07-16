import { logger } from "@/lib/logger";
import { join } from "path";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";

const CACHE_DIR = join(process.cwd(), ".next");
const CACHE_FILE = join(CACHE_DIR, "cache.json");

try { if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}

class PersistentCache {
  private store = new Map<string, string>();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    try {
      if (existsSync(CACHE_FILE)) {
        this.store = new Map(Object.entries(JSON.parse(readFileSync(CACHE_FILE, "utf-8"))));
        logger.info("[Cache] Loaded persistent cache from disk", { count: this.store.size });
      }
    } catch (err: any) {
      logger.error("[Cache] Failed to load cache file, starting empty", { error: err.message });
    }
  }

  private save() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(this.store.entries())), "utf-8")
        .catch((err) => logger.error("[Cache] Failed to save cache file to disk asynchronously", { error: err.message }));
    }, 100);
  }

  async get(key: string) { return this.store.get(key) ?? null; }
  async set(key: string, value: string) { this.store.set(key, value); this.save(); return "OK"; }
  async setex(key: string, ttl: number, value: string) { return this.set(key, value); }
  async del(...keys: string[]) {
    const n = keys.filter(k => this.store.delete(k)).length;
    if (n) this.save();
    return n;
  }
  async keys(pattern: string) {
    const pfx = pattern.replace("*", "");
    return Array.from(this.store.keys()).filter(k => k.startsWith(pfx));
  }
  async flushdb() { this.store.clear(); this.save(); return "OK"; }
}

export const cache = new PersistentCache();

export const CacheKeys = {
  sessionMeta: (sid: string) => `session:${sid}:meta`,
  sessionFile: (sid: string, fid: string) => `session:${sid}:file:${fid}`,
  sessionGraph: (sid: string) => `session:${sid}:graph`,
  sessionCancellation: (sid: string) => `session:${sid}:cancelled`,
  entityCanonical: (type: string, hash: string) => `entity:canonical:${type}:${hash}`,
  jobStatus: (jobId: string) => `job:${jobId}:status`,
} as const;

export const CacheTTL = { session: 86400, graph: 7200, entity: 43200, job: 7200 } as const;

export async function clearSessionGraphCache(sessionId: string): Promise<void> {
  const keys = await cache.keys(`${CacheKeys.sessionGraph(sessionId)}*`);
  if (keys.length) await cache.del(...keys);
}
