import Link from "next/link";
import type { DigestMetric } from "@/lib/core/import/digest";

export function MetricTile({
  metric,
  urgent = false,
}: {
  metric: DigestMetric;
  urgent?: boolean;
}) {
  return (
    <Link href={metric.href} className={`metric-tile ${urgent ? "urgent" : ""}`}>
      <div className="metric-n">{metric.count}</div>
      <div className="metric-label">{metric.label}</div>
      <div className="metric-context">{metric.context}</div>
    </Link>
  );
}
