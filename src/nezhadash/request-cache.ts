/** Small deduplication window; rejected/expired responses never stay indefinitely. */
export function createRequestCache<T>(ttl = 5000, capacity = 64, now = Date.now) {
  const entries = new Map<string, { at: number; request: Promise<T> }>();
  return (key: string, load: () => Promise<T>): Promise<T> => {
    const time = now();
    for (const [storedKey, entry] of entries) {
      if (time - entry.at >= ttl) entries.delete(storedKey);
    }
    const cached = entries.get(key);
    if (cached) return cached.request;
    const request = Promise.resolve().then(load).catch(error => {
      if (entries.get(key)?.request === request) entries.delete(key);
      throw error;
    });
    entries.set(key, { at: time, request });
    while (entries.size > capacity) entries.delete(entries.keys().next().value!);
    return request;
  };
}
