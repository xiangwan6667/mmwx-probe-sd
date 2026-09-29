/** Public image URLs only; never pass script/data URLs or embedded credentials. */
export function backgroundURL(value: unknown): string {
  if (typeof value !== 'string') return '';
  const input = value.trim();
  if (!input || /[\\\r\n]/.test(input)) return '';
  if (input.startsWith('/') && !input.startsWith('//')) return input;
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}
