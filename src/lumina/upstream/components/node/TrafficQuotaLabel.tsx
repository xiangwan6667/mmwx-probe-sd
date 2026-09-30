import { Database } from "lucide-react";
import type { TrafficResetDisplay } from "@lumina/utils/trafficReset";

export function TrafficQuotaLabel({
  reset,
}: {
  reset: TrafficResetDisplay | null;
}) {
  return (
    <span className="traffic-quota-label">
      <span className="traffic-quota-summary">
        <Database size={13} strokeWidth={2} />
        <span>已用</span>
        <span>
          {reset && (
            <span className="traffic-quota-reset" title={reset.title}>
              {" ·"}{reset.label}
            </span>
          )}
        </span>
      </span>
    </span>
  );
}
