import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScorePanel } from "@/components/leads/ScorePanel";
import { ScoreBadge } from "@/components/ui/Badge";
import { ConfidenceBadge } from "@/components/leads/ConfidenceBadge";
import { MissedOpportunityBanner } from "@/components/leads/MissedOpportunityBanner";
import { EnrollButton } from "@/components/leads/EnrollButton";
import { LeadTypeSelect } from "@/components/leads/LeadTypeSelect";
import { markOnboardingStep } from "@/lib/core/onboarding/mark";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string };
}) {
  const user = await requireUser();

  // Coming from the Top 5 filter view satisfies the "review top 5" step.
  if (searchParams.from === "top-5") {
    await markOnboardingStep(user.id, "topLeadsReviewed");
  }
  const lead = await prisma.lead.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      scoreFactors: { orderBy: { points: "desc" } },
      activities: { orderBy: { occurredAt: "desc" }, take: 20 },
      enrollments: {
        where: { status: "active" },
        include: { sequence: true },
        take: 1,
      },
    },
  });
  if (!lead) notFound();

  const activeEnrollment = lead.enrollments[0] ?? null;
  const availableSequences = await prisma.sequence.findMany({
    where: {
      OR: [{ isTemplate: true, userId: null }, { userId: user.id }],
      isActive: true,
      leadType: lead.leadType,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, leadType: true },
  });

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "(no name)";

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/leads" className="btn ghost">← Leads</Link>
          <h1 style={{ margin: 0 }}>{fullName}</h1>
          <ScoreBadge band={lead.scoreBand} />
          {lead.confidence && (
            <ConfidenceBadge
              level={lead.confidence}
              reason={lead.confidenceReason}
            />
          )}
        </div>
        <p>{lead.email ?? "—"} · {lead.phone ?? "—"} · {lead.source ?? "Unknown source"}</p>
        <MissedOpportunityBanner lead={lead} />
        <div style={{ marginTop: 12 }}>
          <EnrollButton
            leadId={lead.id}
            sequences={availableSequences}
            currentSequenceId={activeEnrollment?.sequenceId ?? null}
            currentSequenceName={activeEnrollment?.sequence.name ?? null}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
        <div>
          {lead.aiSummary && (
            <div className="card">
              <h2>Lead snapshot</h2>
              <div className="subtitle">What we know about this lead right now.</div>
              <p style={{ margin: 0 }}>{lead.aiSummary}</p>
            </div>
          )}

          <div className="card">
            <h2>Summary</h2>
            <div className="subtitle">What LeadRevive knows about this lead.</div>
            <dl style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 16px", margin: 0 }}>
              <dt style={{ color: "var(--ink-soft)" }}>Type</dt>
              <dd style={{ margin: 0 }}>
                <LeadTypeSelect leadId={lead.id} currentType={lead.leadType} />
              </dd>
              <dt style={{ color: "var(--ink-soft)" }}>Status</dt>
              <dd style={{ margin: 0 }}>{lead.status}</dd>
              <dt style={{ color: "var(--ink-soft)" }}>Timeframe</dt>
              <dd style={{ margin: 0 }}>{lead.timeframeDays != null ? `${lead.timeframeDays} days` : "—"}</dd>
              <dt style={{ color: "var(--ink-soft)" }}>Intent signal</dt>
              <dd style={{ margin: 0 }}>{lead.intentSignal ?? "—"}</dd>
              <dt style={{ color: "var(--ink-soft)" }}>Tags</dt>
              <dd style={{ margin: 0 }}>{lead.tags.length ? lead.tags.join(", ") : "—"}</dd>
              <dt style={{ color: "var(--ink-soft)" }}>Email status</dt>
              <dd style={{ margin: 0 }}>{lead.emailStatus ?? "—"}</dd>
              <dt style={{ color: "var(--ink-soft)" }}>Phone status</dt>
              <dd style={{ margin: 0 }}>{lead.phoneStatus ?? "—"}</dd>
              <dt style={{ color: "var(--ink-soft)" }}>Dormant</dt>
              <dd style={{ margin: 0 }}>{lead.isDormant ? `Yes (${lead.revivalProbability} revival)` : "No"}</dd>
            </dl>
          </div>

          <div className="card">
            <h2>Next action</h2>
            <div className="subtitle">Suggested next step for this lead.</div>
            {lead.nextAction ? (
              <>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                  {lead.nextAction}
                  {lead.nextActionPriority && (
                    <span
                      className={`badge ${
                        lead.nextActionPriority === "high"
                          ? "hot"
                          : lead.nextActionPriority === "medium"
                          ? "warm"
                          : "low"
                      }`}
                      style={{ marginLeft: 8 }}
                    >
                      {lead.nextActionPriority}
                    </span>
                  )}
                </p>
                {lead.nextActionReason && (
                  <p style={{ margin: "8px 0 0", color: "var(--ink-soft)" }}>
                    <strong>Why: </strong>{lead.nextActionReason}
                  </p>
                )}
                {lead.nextActionGeneratedAt && (
                  <p style={{ margin: "8px 0 0", color: "var(--ink-mute)", fontSize: 11 }}>
                    Generated {lead.nextActionGeneratedAt.toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <div className="empty">
                No next action generated yet.
              </div>
            )}
          </div>

          {lead.isDormant && lead.revivalReasons.length > 0 && (
            <div className="card">
              <h2>Revival signals</h2>
              <div className="subtitle">
                Why this lead is flagged as <strong>{lead.revivalProbability}</strong> revival probability.
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {lead.revivalReasons.map((r, i) => (
                  <li key={i} style={{ padding: "3px 0", color: "var(--ink-soft)" }}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2>Activity</h2>
            <div className="subtitle">Recent events for this lead.</div>
            {lead.activities.length === 0 ? (
              <div className="empty">No activity yet.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {lead.activities.map((a) => (
                  <li key={a.id} style={{ padding: "4px 0", color: "var(--ink-soft)" }}>
                    <code style={{ color: "var(--ink)" }}>{a.type}</code> ·{" "}
                    {a.occurredAt.toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <ScorePanel
          score={lead.score}
          band={lead.scoreBand}
          factors={lead.scoreFactors}
          confidence={lead.confidence}
          confidenceReason={lead.confidenceReason}
        />
      </div>
    </>
  );
}
