import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SequencesLibrary() {
  const user = await requireUser();

  const sequences = await prisma.sequence.findMany({
    where: {
      OR: [{ isTemplate: true, userId: null }, { userId: user.id }],
      isActive: true,
    },
    include: { _count: { select: { steps: true, enrollments: true } } },
    orderBy: [{ leadType: "asc" }, { name: "asc" }],
  });

  const byType = sequences.reduce<Record<string, typeof sequences>>((acc, s) => {
    (acc[s.leadType] ??= []).push(s);
    return acc;
  }, {});

  const order = ["seller", "buyer", "investor", "rental", "valuation", "dormant"];

  return (
    <>
      <div className="page-header">
        <h1>Sequence library</h1>
        <p>
          {sequences.length} sequences · 3 variants per lead type · each step
          personalized at render time.
        </p>
      </div>

      {order.map((type) => {
        const list = byType[type] ?? [];
        if (list.length === 0) return null;
        return (
          <div key={type} className="card">
            <h2 style={{ textTransform: "capitalize" }}>{type}</h2>
            <div className="subtitle">
              {list.length} sequence{list.length === 1 ? "" : "s"} for {type} leads
            </div>
            <table className="lead-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 8 }}>Name</th>
                  <th>Tone</th>
                  <th>Steps</th>
                  <th>Enrolled</th>
                  <th>CTA goal</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td style={{ paddingLeft: 8 }}>
                      <Link href={`/sequences/${s.id}`}>{s.name}</Link>
                      {s.isTemplate && (
                        <span
                          className="badge nurture"
                          style={{ marginLeft: 8, fontSize: 10 }}
                        >
                          template
                        </span>
                      )}
                    </td>
                    <td>{s.tone}</td>
                    <td>{s._count.steps}</td>
                    <td>{s._count.enrollments}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{s.ctaGoal ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}
