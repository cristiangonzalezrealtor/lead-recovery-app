import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRevivalStats } from "@/lib/core/revival/stats";
import { ScoreBadge } from "@/components/ui/Badge";
import { BulkReviveButton } from "@/components/revival/BulkReviveButton";

export default async function RevivalPage() {
  const user = await requireUser();
  const stats = await getRevivalStats(user.id);

  const dormantHigh = await prisma.lead.findMany({
    where: { userId: user.id, isDormant: true, revivalProbability: "high" },
    orderBy: { score: "desc" },
    take: 20,
  });

  const dormantMedium = await prisma.lead.findMany({
    where: { userId: user.id, isDormant: true, revivalProbability: "medium" },
    orderBy: { score: "desc" },
    take: 10,
  });

  const dormantSequences = await prisma.sequence.findMany({
    where: {
      leadType: "dormant",
      isActive: true,
      OR: [{ isTemplate: true, userId: null }, { userId: user.id }],
    },
    select: { id: true, name: true, tone: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="page-header">
        <h1>Revival campaigns</h1>
        <p>Reactivate dormant leads with curiosity-led, value-driven sequences.</p>
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div className="preview-summary">
        <div className="stat">
          <div className="n">{stats.dormantTotal}</div>
          <div className="k">Dormant total</div>
        </div>
        <div className="stat">
          <div className="n">{stats.revivedThisWeek}</div>
          <div className="k">Revived this week</div>
        </div>
        <div className="stat">
          <div className="n">{stats.revivedThisMonth}</div>
          <div className="k">Revived this month</div>
        </div>
        <div className="stat">
          <div className="n">{(stats.revivalRateMonthly * 100).toFixed(1)}%</div>
          <div className="k">Revival rate (30d)</div>
        </div>
      </div>

      {/* ── Probability breakdown ──────────────────────────── */}
      <div className="card">
        <h2>Dormant breakdown</h2>
        <div className="subtitle">
          {stats.dormantTotal === 0
            ? "No dormant leads yet — bulk imports with the dormant flag land here."
            : "Prioritize high probability first, then medium."}
        </div>
        {stats.dormantTotal > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div>
              <span className="badge hot">High</span>{" "}
              <strong>{stats.dormantByProbability.high}</strong>
            </div>
            <div>
              <span className="badge warm">Medium</span>{" "}
              <strong>{stats.dormantByProbability.medium}</strong>
            </div>
            <div>
              <span className="badge low">Low</span>{" "}
              <strong>{stats.dormantByProbability.low}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── Start a campaign ──────────────────────────────── */}
      <div className="card">
        <h2>Start a revival campaign</h2>
        <div className="subtitle">
          Pick a dormant sequence and bulk-enroll your best dormant leads.
        </div>
        <BulkReviveButton sequences={dormantSequences} />
      </div>

      {/* ── Recently revived ──────────────────────────────── */}
      <div className="card">
        <h2>Recently revived</h2>
        <div className="subtitle">
          {stats.recentlyRevived.length === 0
            ? "Nothing revived this week yet. Launching a campaign shows up here as leads start engaging."
            : `${stats.recentlyRevived.length} lead${
                stats.recentlyRevived.length === 1 ? "" : "s"
              } came back to life in the last 7 days.`}
        </div>
        {stats.recentlyRevived.length > 0 && (
          <table className="lead-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Score</th>
                <th>Revived</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentlyRevived.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/leads/${l.id}`}>
                      {[l.firstName, l.lastName].filter(Boolean).join(" ") ||
                        l.email ||
                        "(no name)"}
                    </Link>
                  </td>
                  <td>{l.leadType}</td>
                  <td className="score-cell">{l.score}</td>
                  <td style={{ color: "var(--ink-soft)" }}>
                    {l.revivedAt?.toLocaleString() ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── High probability dormant ──────────────────────── */}
      <div className="card">
        <h2>High probability dormant</h2>
        <div className="subtitle">
          These have the strongest revival signals. Prioritize these first.
        </div>
        {dormantHigh.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No high-probability dormant leads</div>
            <div className="empty-state-body">
              Run a scan or import an old list with the dormant flag to populate this.
            </div>
          </div>
        ) : (
          <table className="lead-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Score</th>
                <th>Band</th>
                <th>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {dormantHigh.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/leads/${l.id}`}>
                      {[l.firstName, l.lastName].filter(Boolean).join(" ") ||
                        l.email ||
                        "(no name)"}
                    </Link>
                  </td>
                  <td>{l.leadType}</td>
                  <td className="score-cell">{l.score}</td>
                  <td>
                    <ScoreBadge band={l.scoreBand} />
                  </td>
                  <td style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                    {l.revivalReasons.slice(0, 2).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Top revival sequences ─────────────────────────── */}
      {stats.topRevivalSequences.length > 0 && (
        <div className="card">
          <h2>Top revival sequences</h2>
          <div className="subtitle">Ranked by reply rate.</div>
          <table className="lead-table">
            <thead>
              <tr>
                <th>Sequence</th>
                <th>Enrolled</th>
                <th>Replied</th>
                <th>Engaged</th>
              </tr>
            </thead>
            <tbody>
              {stats.topRevivalSequences.map((s) => (
                <tr key={s.sequenceId}>
                  <td>
                    <Link href={`/sequences/${s.sequenceId}`}>{s.name}</Link>
                  </td>
                  <td>{s.enrolledCount}</td>
                  <td>{s.repliedCount}</td>
                  <td>{s.engagedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
