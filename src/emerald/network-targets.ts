import type { ProbePingSeries, TriISPPublic } from '../types';
import { triISPRows } from '../tri-isp';

/** Match public target keys; never describe arbitrary targets as an ISP. */
export function networkTargets(config: TriISPPublic | undefined, series: ProbePingSeries[]) {
  const configured = triISPRows(config, series);
  const hasMatchedTarget = Boolean(config?.enabled && config.targets?.some(target => series.some(item => item.key === target.key)));
  const rows = configured.length ? configured : series.slice(0, 3).map(item => ({ label: item.label, series: item }));
  return {
    label: hasMatchedTarget ? '三网' : '延迟目标',
    targets: rows.map(row => ({
      name: row.label,
      latency: row.series && Number.isFinite(row.series.current_ms) && row.series.current_ms >= 0 ? row.series.current_ms : null,
    })),
  };
}
