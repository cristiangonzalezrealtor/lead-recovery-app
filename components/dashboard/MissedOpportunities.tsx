import Link from "next/link";
import type { Lead } from "@prisma/client";
import { MissedOpportunityRow } from "@/components/leads/MissedOpportunityRow";

export function MissedOpportunities({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return null;

  const total = leads.length;
  const critical = leads.filter(
    (l) => l.missedOpportunitySeverity === "critical"
  ).length;

  return (
    <div className="card missed-card">
      <div className="card-header-row">
        <div>
          <h2>
            <span className="warn-icon">⚠</span> Missed opportunities (fix these now)
          </h2>
          <div className="subtitle">
            {critical > 0 ? (
              <>
                <strong style={{ color: "#991b1b" }}>{critical}</strong>{" "}
                critical · {total - critical} more slipping
              </>
            ) : (
              <>
                <strong>{total}</strong> hot lead{total === 1 ? " has" : "s have"}{" "}
                gone untouched for over 48 hours.
              </>
            )}
          </div>
        </div>
        <Link className="btn" href="/leads/missed-opportunities">
          Work missed opportunities →
        </Link>
      </div>

      <div className="missed-list">
        {leads.slice(0, 5).map((lead) => (
          <MissedOpportunityRow key={lead.id} lead={lead} />
        ))}
      </div>
      {total > 5 && (
        <div className="missed-footer">
          <Link href="/leads/missed-opportunities">View all {total} →</Link>
        </div>
      )}
    </div>
  );
}
