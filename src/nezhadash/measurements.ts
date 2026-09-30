/** Join independent metric series without inventing zeros for absent directions. */
export function joinMetricSeries(
  left: { ts: number; value: number }[], right: { ts: number; value: number }[],
): { timeStamp: string; left: number; right: number }[] {
  const a = new Map(left.filter(point => Number.isFinite(point.ts) && Number.isFinite(point.value)).map(point => [point.ts, point.value]));
  const b = new Map(right.filter(point => Number.isFinite(point.ts) && Number.isFinite(point.value)).map(point => [point.ts, point.value]));
  return [...new Set([...a.keys(), ...b.keys()])].sort((x, y) => x - y).map(ts => ({
    timeStamp: String(ts), left: a.get(ts) ?? NaN, right: b.get(ts) ?? NaN,
  }));
}
