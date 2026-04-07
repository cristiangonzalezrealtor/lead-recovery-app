import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SequenceDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();

  const seq = await prisma.sequence.findFirst({
    where: {
      id: params.id,
      OR: [{ isTemplate: true, userId: null }, { userId: user.id }],
    },
    include: {
      steps: { orderBy: { stepIndex: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!seq) notFound();

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link className="btn ghost" href="/sequences">← Library</Link>
          <h1 style={{ margin: 0 }}>{seq.name}</h1>
          {seq.isTemplate && <span className="badge nurture">template</span>}
        </div>
        <p>
          {seq.leadType} · {seq.tone} tone · {seq.steps.length} steps ·{" "}
          {seq._count.enrollments} active enrollments
        </p>
      </div>

      <div className="card">
        <h2>Cadence</h2>
        <div className="subtitle">Day offset for each step. Timing relative to enrollment start.</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {seq.steps.map((s) => (
            <span key={s.id} className="badge low" style={{ fontSize: 11 }}>
              Step {s.stepIndex + 1} · D{s.dayOffset}
            </span>
          ))}
        </div>
      </div>

      {seq.steps.map((step) => (
        <div className="card" key={step.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2>Step {step.stepIndex + 1} — Day {step.dayOffset}</h2>
            <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>{step.channel}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Subject</div>
            <div style={{ fontWeight: 500, margin: "2px 0 12px" }}>{step.subjectTemplate}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Body template</div>
            <pre style={{
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 13,
              background: "#fafaf9",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 12,
              margin: "4px 0 12px",
              color: "var(--ink-soft)",
            }}>{step.bodyTemplate}</pre>
            {step.aiInstructions && (
              <>
                <div style={{ fontSize: 12, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>AI instructions</div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{step.aiInstructions}</div>
              </>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
