import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ImportsPage() {
  const user = await requireUser();
  const imports = await prisma.import.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>Imports</h1>
          <p>History of every CSV you&rsquo;ve uploaded.</p>
        </div>
        <Link className="btn primary" href="/imports/new">New import</Link>
      </div>
      <div className="card" style={{ padding: 0 }}>
        {imports.length === 0 ? (
          <div className="empty" style={{ padding: 20 }}>No imports yet.</div>
        ) : (
          <table className="lead-table">
            <thead><tr><th style={{paddingLeft: 22}}>File</th><th>Rows</th><th>Accepted</th><th>Rejected</th><th>Dormant</th><th>When</th></tr></thead>
            <tbody>
              {imports.map((i) => (
                <tr key={i.id}>
                  <td style={{paddingLeft: 22}}>{i.filename}</td>
                  <td>{i.rowCount}</td>
                  <td>{i.acceptedCount}</td>
                  <td>{i.rejectedCount}</td>
                  <td>{i.markAsDormant ? "Yes" : "—"}</td>
                  <td style={{color:"var(--ink-soft)"}}>{i.committedAt?.toLocaleString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
