// lib/cache.ts
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function cachedFetch(key: string, fetcher: () => Promise<any>, ttl: number = CACHE_DURATION) {
  const now = Date.now();
  const cached = cache.get(key);
  
  if (cached && now - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetcher();
  cache.set(key, { data, timestamp: now });
  return data;
}

export function invalidateCache(key: string) {
  cache.delete(key);
}
