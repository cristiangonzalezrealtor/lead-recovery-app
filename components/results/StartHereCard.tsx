import Link from "next/link";
import type { StartHereAction } from "@/lib/core/import/digest";

const ICONS: Record<StartHereAction["kind"], string> = {
  hot_lead: "🔥",
  dormant_revival: "◌",
  nurture_assign: "↻",
  empty_fallback: "→",
};

export function StartHereCard({ action }: { action: StartHereAction }) {
  return (
    <div className="start-here-card">
      <div className="icon">{ICONS[action.kind]}</div>
      <div className="body">
        <div className="title">{action.title}</div>
        <div className="subtitle">{action.subtitle}</div>
        <div className="why">Why this matters: {action.whyItMatters}</div>
      </div>
      <div className="cta">
        <Link className="btn" href={action.ctaHref}>
          {action.ctaLabel} →
        </Link>
      </div>
    </div>
  );
}
