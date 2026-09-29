import { resolveExpireTimestamp } from "@lumina/utils/format";

export interface TrafficResetDisplay {
  label: string;
  title: string;
}

/** Only the master-provided billing period end is a known reset boundary. */
export function getTrafficResetDisplay(
  periodEnd: string | number | null | undefined,
  now: number,
): TrafficResetDisplay | null {
  const timestamp = resolveExpireTimestamp(periodEnd);
  if (timestamp == null || !Number.isFinite(now) || timestamp < now) return null;
  const end = new Date(timestamp);
  const today = new Date(now);
  const ordinal = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = (ordinal(end) - ordinal(today)) / 86_400_000;
  const dateLabel = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  return {
    label: days === 0 ? "今日重置" : `${days}天后重置`,
    title: `当前流量周期结束：${dateLabel}`,
  };
}
