/** ECharts HTML tooltips must treat public labels as text, unlike Vue templates. */
export function escapeTooltipText(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, character => entities[character]!);
}
