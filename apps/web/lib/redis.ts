import { logger } from "@/lib/logger";
import { join } from "path";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "fs";

const CACHE_DIR = join(process.cwd(), ".next");
const CACHE_FILE = join(CACHE_DIR, "cache.json");

try {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  // Fallback in case of filesystem issues
}

class PersistentCache {
  private store = new Map<string, string>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (existsSync(CACHE_FILE)) {
        const data = readFileSync(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(data);
        this.store = new Map(Object.entries(parsed));
        logger.info("[Cache] Loaded persistent cache from disk", { count: this.store.size });
      }
    } catch (err: any) {
      logger.error("[Cache] Failed to load cache file, starting empty", { error: err.message });
      this.store = new Map();
    }
  }

  private save() {
    try {
      const obj = Object.fromEntries(this.store.entries());
      writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (err: any) {
      logger.error("[Cache] Failed to save cache file to disk", { error: err.message });
    }
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<string> {
    this.store.set(key, value);
    this.save();
    return "OK";
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<string> {
    this.store.set(key, value);
    this.save();
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      this.save();
    }
    return deletedCount;
  }

  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace("*", "");
    const matchingKeys: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        matchingKeys.push(key);
      }
    }
    return matchingKeys;
  }

  async flushdb(): Promise<string> {
    this.store.clear();
    this.save();
    return "OK";
  }
}

export const redis = new PersistentCache();


export const RedisKeys = {
  sessionMeta: (sid: string) => `session:${sid}:meta`,
  sessionFile: (sid: string, fid: string) => `session:${sid}:file:${fid}`,
  sessionGraph: (sid: string) => `session:${sid}:graph`,
  sessionCancellation: (sid: string) => `session:${sid}:cancelled`,
  entityCanonical: (type: string, hash: string) =>
    `entity:canonical:${type}:${hash}`,
  jobStatus: (jobId: string) => `job:${jobId}:status`,
} as const;

// ─── TTLs (seconds) ────────────────────────────────────────────────────────────

export const RedisTTL = {
  session: 60 * 60 * 24, // 24h
  graph: 60 * 60 * 2, // 2h
  entity: 60 * 60 * 12, // 12h
  job: 60 * 60 * 2, // 2h
} as const;

// ─── Invalidation Helpers ──────────────────────────────────────────────────────

export async function clearSessionGraphCache(sessionId: string): Promise<void> {
  const prefix = RedisKeys.sessionGraph(sessionId);
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

