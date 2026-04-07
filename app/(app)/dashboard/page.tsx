import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActNowLeads } from "@/lib/core/act-now/ranking";
import { getRevivalStats } from "@/lib/core/revival/stats";
import { getOnboardingState } from "@/lib/core/onboarding/state";
import { getActivitySignals } from "@/lib/core/dashboard/activity";
import { getRevivalStories } from "@/lib/core/dashboard/stories";

import { Checklist } from "@/components/onboarding/Checklist";
import { ChecklistBanner } from "@/components/onboarding/ChecklistBanner";
import { TopFiveLeads } from "@/components/dashboard/TopFiveLeads";
import { MissedOpportunities } from "@/components/dashboard/MissedOpportunities";
import { RevivedThisWeek } from "@/components/dashboard/RevivedThisWeek";
import { ActivitySignals } from "@/components/dashboard/ActivitySignals";
import { DashboardSection } from "@/components/dashboard/Section";

export default async function DashboardPage() {
  const user = await requireUser();

  // ── Parallel data load ────────────────────────────────────────
  const [
    rankedTopFive,
    missedOpps,
    revivalStories,
    revivalStats,
    activitySignals,
    inNurtureEnrollments,
    dormant,
    totalLeads,
    onboarding,
    activeEnrollments,
    sequencesAll,
  ] = await Promise.all([
    getActNowLeads(user.id, 5),
    prisma.lead.findMany({
      where: { userId: user.id, missedOpportunity: true },
      orderBy: [
        { missedOpportunitySeverity: "asc" },
        { missedOpportunitySince: "asc" },
      ],
      take: 8,
    }),
    getRevivalStories(user.id, 2),
    getRevivalStats(user.id),
    getActivitySignals(user.id),
    prisma.sequenceEnrollment.findMany({
      where: { status: "active", lead: { userId: user.id } },
      take: 5,
      include: { lead: true, sequence: true },
      orderBy: { nextSendAt: "asc" },
    }),
    prisma.lead.findMany({
      where: {
        userId: user.id,
        isDormant: true,
        revivalProbability: { in: ["high", "medium"] },
      },
      orderBy: [{ revivalProbability: "asc" }, { score: "desc" }],
      take: 5,
    }),
    prisma.lead.count({ where: { userId: user.id } }),
    getOnboardingState(user.id),
    prisma.sequenceEnrollment.findMany({
      where: { status: "active", lead: { userId: user.id } },
      select: { leadId: true },
    }),
    prisma.sequence.findMany({
      where: {
        OR: [{ isTemplate: true, userId: null }, { userId: user.id }],
        isActive: true,
      },
      select: { id: true, name: true, leadType: true },
    }),
  ]);

  const enrolledLeadIds = new Set(activeEnrollments.map((e) => e.leadId));
  const sequencesByType: Record<string, typeof sequencesAll> = {};
  for (const s of sequencesAll) {
    (sequencesByType[s.leadType] ??= []).push(s);
  }

  const inNurtureLeads = inNurtureEnrollments.map((e) => e.lead);
  const hasLeads = totalLeads > 0;

  return (
    <>
      {/* Onboarding checklist (Step 3) */}
      <Checklist state={onboarding} />
      {onboarding.showBanner && (
        <ChecklistBanner
          done={onboarding.progress.done}
          total={onboarding.progress.total}
        />
      )}

      <div className="page-header">
        <h1>Dashboard</h1>
        <p>
          {totalLeads === 0
            ? "No leads yet. Import a CSV to get started."
            : `${totalLeads} leads · ${user.brandProfile?.agentName ?? user.email}`}
        </p>
        {hasLeads && (
          <div className="system-reinforcement">
            ✓ Your system is actively working your leads
          </div>
        )}
      </div>

      {/* ── PRIMARY ─────────────────────────────────────────── */}
      <TopFiveLeads
        ranked={rankedTopFive}
        hasAnyLeads={hasLeads}
        enrolledLeadIds={enrolledLeadIds}
        sequencesByType={sequencesByType}
      />

      <MissedOpportunities leads={missedOpps} />

      <RevivedThisWeek
        stories={revivalStories}
        totalThisWeek={revivalStats.revivedThisWeek}
      />

      {/* ── SECONDARY ───────────────────────────────────────── */}
      <ActivitySignals signals={activitySignals} />

      <DashboardSection
        title="In Nurture"
        question="What's running right now?"
        primaryLabel="View sequences"
        primaryHref="/sequences"
        leads={inNurtureLeads}
        empty={{
          icon: "↻",
          title: "No sequences running yet",
          body: "Your warm leads are waiting. One sequence keeps them moving — so nothing slips.",
          ctaLabel: hasLeads ? "Browse leads" : undefined,
          ctaHref: hasLeads ? "/leads" : undefined,
        }}
      />

      <div className="card">
        <div className="card-header-row">
          <div>
            <h2>Dormant Revival</h2>
            <div className="subtitle">Which old leads are worth saving?</div>
          </div>
          <Link className="btn" href="/revival">Open revival center</Link>
        </div>
        {revivalStats.dormantTotal === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">◌</div>
            <div className="empty-state-title">
              No revival opportunities — try uploading older leads
            </div>
            <div className="empty-state-body">
              Bulk-import an old list and we&rsquo;ll surface the best ones to
              reactivate.
            </div>
            <Link className="btn" href="/imports/new">New import</Link>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
                marginTop: 8,
              }}
            >
              <div className="dormant-stat">
                <div className="dormant-n">{revivalStats.dormantTotal}</div>
                <div className="dormant-k">Dormant</div>
              </div>
              <div className="dormant-stat">
                <div className="dormant-n">
                  {revivalStats.dormantByProbability.high}
                </div>
                <div className="dormant-k">High prob.</div>
              </div>
              <div className="dormant-stat">
                <div className="dormant-n">{revivalStats.revivedThisWeek}</div>
                <div className="dormant-k">Revived 7d</div>
              </div>
              <div className="dormant-stat">
                <div className="dormant-n">
                  {(revivalStats.revivalRateMonthly * 100).toFixed(0)}%
                </div>
                <div className="dormant-k">Rate 30d</div>
              </div>
            </div>
            {dormant.length > 0 && (
              <table className="lead-table" style={{ marginTop: 16 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Probability</th>
                    <th>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {dormant.map((l) => (
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
                        <span
                          className={`badge ${
                            l.revivalProbability === "high"
                              ? "hot"
                              : l.revivalProbability === "medium"
                              ? "warm"
                              : "low"
                          }`}
                        >
                          {l.revivalProbability}
                        </span>
                      </td>
                      <td style={{ color: "var(--ink-soft)", fontSize: 12 }}>
                        {l.revivalReasons.slice(0, 2).join(" · ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* ── REFERENCE ───────────────────────────────────────── */}
      <div className="card">
        <h2>Score Logic</h2>
        <div className="subtitle">How LeadRevive AI ranks every lead.</div>
        <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>
          Every score is the sum of six transparent factors — intent,
          timeframe, engagement, source quality, data completeness, and fit.
          Open any lead to see the exact breakdown.
        </p>
        <div style={{ marginTop: 12 }}>
          <span className="badge hot" style={{ marginRight: 6 }}>Hot 85+</span>
          <span className="badge warm" style={{ marginRight: 6 }}>Warm 65–84</span>
          <span className="badge nurture" style={{ marginRight: 6 }}>Nurture 40–64</span>
          <span className="badge low">Low &lt;40</span>
        </div>
      </div>
    </>
  );
}
