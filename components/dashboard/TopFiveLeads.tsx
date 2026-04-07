import Link from "next/link";
import type { Lead, Sequence, LeadType } from "@prisma/client";
import { TopFiveLeadRow } from "./TopFiveLeadRow";
import { GROUP_LABELS } from "@/lib/core/act-now/ranking";

interface RankedLead {
  group: string;
  lead: Lead;
}

interface Props {
  ranked: RankedLead[];
  hasAnyLeads: boolean;
  enrolledLeadIds: Set<string>;
  sequencesByType: Record<string, { id: string; name: string; leadType: string }[]>;
}

export function TopFiveLeads({
  ranked,
  hasAnyLeads,
  enrolledLeadIds,
  sequencesByType,
}: Props) {
  return (
    <div className="card top-five-card">
      <div className="card-header-row">
        <div>
          <h2>Top 5 leads to work today</h2>
          <div className="subtitle">
            Sorted by what will move a deal forward fastest.
          </div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <div className="empty-state-title">
            {hasAnyLeads
              ? "No urgent leads right now"
              : "Your dashboard is waiting for leads"}
          </div>
          <div className="empty-state-body">
            {hasAnyLeads
              ? "Your system is running well — stay consistent and keep momentum."
              : "Upload a CSV and we'll start finding the deals hiding in your database."}
          </div>
          {hasAnyLeads ? (
            <Link className="btn" href="/leads">Browse all leads</Link>
          ) : (
            <Link className="btn primary" href="/imports/new">Upload CSV</Link>
          )}
        </div>
      ) : (
        <div className="top-five-list">
          {ranked.slice(0, 5).map((entry, i) => (
            <TopFiveLeadRow
              key={entry.lead.id}
              position={i + 1}
              lead={entry.lead}
              groupLabel={GROUP_LABELS[entry.group]}
              hasActiveEnrollment={enrolledLeadIds.has(entry.lead.id)}
              sequencesForType={sequencesByType[entry.lead.leadType] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
