import Link from "next/link";
import { ScoreBadge } from "@/components/ui/Badge";
import type { BestOpportunityLead } from "@/lib/core/import/digest";
import type { ScoreBand } from "@prisma/client";

export function BestOpportunity({ lead }: { lead: BestOpportunityLead }) {
  return (
    <div className="best-opportunity">
      <div className="eyebrow">Your best opportunity</div>
      <h3>{lead.headline}</h3>
      <div className="meta">
        <ScoreBadge band={lead.band as ScoreBand} />
        <span>·</span>
        <span>{lead.leadType}</span>
        <span>·</span>
        <span>Scored {lead.score}</span>
        {lead.confidence && (
          <>
            <span>·</span>
            <span>{lead.confidence} confidence</span>
          </>
        )}
      </div>
      <p className="why">{lead.why}</p>
      <Link className="btn primary" href={`/leads/${lead.id}`}>
        Open this lead
      </Link>
    </div>
  );
}
