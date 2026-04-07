import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MissedOpportunityRow } from "@/components/leads/MissedOpportunityRow";

export default async function MissedOpportunitiesPage() {
  const user = await requireUser();

  const leads = await prisma.lead.findMany({
    where: { userId: user.id, missedOpportunity: true },
    orderBy: [
      { missedOpportunitySeverity: "asc" }, // critical first (alphabetical → critical < high < medium)
      { missedOpportunitySince: "asc" },
    ],
  });

  // groupBy severity
  const groups = {
    critical: [] as typeof leads,
    high: [] as typeof leads,
    medium: [] as typeof leads,
  };
  for (const l of leads) {
    const sev = l.missedOpportunitySeverity ?? "high";
    groups[sev].push(l);
  }

  // Recovered today — leads that were marked handled in the last 24h.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recoveredToday = await prisma.lead.count({
    where: {
      userId: user.id,
      missedOpportunityHandledAt: { gte: dayAgo },
    },
  });
  const totalToWork = leads.length + recoveredToday;

  return (
    <>
      <div className="page-header">
        <h1>⚠ Missed opportunities</h1>
        <p>These deals are still recoverable — act now before they go cold.</p>
        <div className="missed-page-meta">
          <span className="missed-progress">
            <strong>{recoveredToday}</strong> of {totalToWork} recovered today
          </span>
          <span className="missed-sort-label">Sorted by urgency</span>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <div className="empty-state-title">
              Nothing slipping through the cracks
            </div>
            <div className="empty-state-body">
              Your system is on top of it. Keep working your top leads and
              we&rsquo;ll surface anything that starts going cold.
            </div>
            <Link className="btn" href="/dashboard">
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="missed-stat-strip">
            <div className={`missed-stat critical ${groups.critical.length === 0 ? "muted" : ""}`}>
              <div className="missed-stat-n">{groups.critical.length}</div>
              <div className="missed-stat-label">Critical</div>
            </div>
            <div className={`missed-stat high ${groups.high.length === 0 ? "muted" : ""}`}>
              <div className="missed-stat-n">{groups.high.length}</div>
              <div className="missed-stat-label">High</div>
            </div>
            <div className={`missed-stat medium ${groups.medium.length === 0 ? "muted" : ""}`}>
              <div className="missed-stat-n">{groups.medium.length}</div>
              <div className="missed-stat-label">Medium</div>
            </div>
          </div>

          {groups.critical.length > 0 && (
            <div className="missed-group">
              <div className="missed-group-label critical">
                CRITICAL — RESPOND TODAY
              </div>
              <div className="missed-group-sub">This lead is going cold right now.</div>
              {groups.critical.map((lead) => (
                <MissedOpportunityRow key={lead.id} lead={lead} detailed />
              ))}
            </div>
          )}

          {groups.high.length > 0 && (
            <div className="missed-group">
              <div className="missed-group-label high">HIGH</div>
              {groups.high.map((lead) => (
                <MissedOpportunityRow key={lead.id} lead={lead} />
              ))}
            </div>
          )}

          {groups.medium.length > 0 && (
            <div className="missed-group">
              <div className="missed-group-label medium">
                MEDIUM · OPPORTUNITY BUILDING
              </div>
              {groups.medium.map((lead) => (
                <MissedOpportunityRow key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
