/** Public monitor labels may match Object.prototype names. */
export function monitorDictionary<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}
