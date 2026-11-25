type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const globalCacheStore = globalThis as typeof globalThis & {
  __groupsorSettingsCache?: Map<string, CacheEntry<unknown>>;
  __groupsorWarnedKeys?: Set<string>;
};

function getStore(): Map<string, CacheEntry<unknown>> {
  if (!globalCacheStore.__groupsorSettingsCache) {
    globalCacheStore.__groupsorSettingsCache = new Map();
  }
  return globalCacheStore.__groupsorSettingsCache;
}

export async function getCachedValue<T>(
  key: string,
  loader: () => Promise<T>,
  fallback: T,
  ttlMs = CACHE_TTL_MS
): Promise<T> {
  const store = getStore();
  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  try {
    const fresh = await loader();
    store.set(key, { value: fresh, expiresAt: now + ttlMs });
    return fresh;
  } catch (err) {
    if (!globalCacheStore.__groupsorWarnedKeys) {
      globalCacheStore.__groupsorWarnedKeys = new Set();
    }
    if (!globalCacheStore.__groupsorWarnedKeys.has(key)) {
      globalCacheStore.__groupsorWarnedKeys.add(key);
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[cache:${key}] Falling back to cached/default value (${msg})`);
    }
    // Serve stale cached value briefly instead of slamming Firestore again immediately
    if (existing) {
      store.set(key, { value: existing.value, expiresAt: now + 60_000 });
      return existing.value;
    }
    store.set(key, { value: fallback, expiresAt: now + 60_000 });
    return fallback;
  }
}

export function invalidateCachedKey(key: string): void {
  getStore().delete(key);
  globalCacheStore.__groupsorWarnedKeys?.delete(key);
}
