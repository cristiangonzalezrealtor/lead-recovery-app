import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ScoreBadge } from "@/components/ui/Badge";
import { ConfidenceBadge } from "@/components/leads/ConfidenceBadge";
import { RescoreAllButton } from "@/components/leads/RescoreAllButton";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 100;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: {
    filter?: string;
    type?: string;
    band?: string;
    show?: string;
    page?: string;
  };
}) {
  const user = await requireUser();

  const where: Prisma.LeadWhereInput = { userId: user.id };
  if (searchParams.filter === "dormant") where.isDormant = true;
  if (searchParams.filter === "act-now") where.scoreBand = "hot";
  if (searchParams.filter === "heating-up") where.scoreBand = { in: ["warm", "nurture"] };
  if (searchParams.filter === "missed-opportunities") where.missedOpportunity = true;
  if (searchParams.filter === "ready-to-nurture") {
    where.scoreBand = { in: ["warm", "nurture"] };
    where.isDormant = false;
    where.enrollments = { none: { status: "active" } };
  }
  if (searchParams.type) where.leadType = searchParams.type as Prisma.LeadWhereInput["leadType"];
  if (searchParams.band) where.scoreBand = searchParams.band as Prisma.LeadWhereInput["scoreBand"];

  // Top 5 filter takes precedence and limits results.
  const topFive = searchParams.filter === "top-5";
  const showConfidence = searchParams.show === "confidence";

  const pageNum = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const skip = topFive ? 0 : (pageNum - 1) * PAGE_SIZE;

  // Build the toggle URL by preserving existing params and flipping `show`.
  const toggleParams = new URLSearchParams();
  if (searchParams.filter) toggleParams.set("filter", searchParams.filter);
  if (searchParams.type) toggleParams.set("type", searchParams.type);
  if (searchParams.band) toggleParams.set("band", searchParams.band);
  if (!showConfidence) toggleParams.set("show", "confidence");
  const toggleHref = `/leads${toggleParams.toString() ? `?${toggleParams.toString()}` : ""}`;

  const effectiveWhere = topFive ? { userId: user.id } : where;

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
      where: effectiveWhere,
      orderBy: topFive
        ? [{ nextActionPriority: "asc" }, { score: "desc" }]
        : [{ score: "desc" }, { updatedAt: "desc" }],
      take: topFive ? 5 : PAGE_SIZE,
      skip,
    }),
    topFive
      ? Promise.resolve(5)
      : prisma.lead.count({ where: effectiveWhere }),
  ]);

  const totalPages = topFive ? 1 : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = !topFive && pageNum > 1;
  const hasNext = !topFive && pageNum < totalPages;

  // Preserve filters when building page links.
  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (searchParams.filter) params.set("filter", searchParams.filter);
    if (searchParams.type) params.set("type", searchParams.type);
    if (searchParams.band) params.set("band", searchParams.band);
    if (searchParams.show) params.set("show", searchParams.show);
    if (p > 1) params.set("page", String(p));
    return `/leads${params.toString() ? `?${params.toString()}` : ""}`;
  }

  const rangeStart = totalCount === 0 ? 0 : skip + 1;
  const rangeEnd = skip + leads.length;

  return (
    <>
      <div className="page-header">
        <h1>Leads</h1>
        <p>
          {topFive
            ? `Top ${leads.length} — sorted by priority`
            : totalCount === 0
            ? "No leads yet"
            : `${totalCount.toLocaleString()} leads · showing ${rangeStart}–${rangeEnd} · sorted by score`}
        </p>
      </div>

      <div
        className="card"
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn" href="/leads">All</Link>
          <Link className="btn" href="/leads?band=hot">Hot</Link>
          <Link className="btn" href="/leads?band=warm">Warm</Link>
          <Link className="btn" href="/leads?band=nurture">Nurture</Link>
          <Link className="btn" href="/leads?filter=dormant">Dormant</Link>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link className={`btn ${showConfidence ? "primary" : ""}`} href={toggleHref}>
            {showConfidence ? "Hide" : "Show"} confidence (trust level)
          </Link>
          <RescoreAllButton leadCount={totalCount} />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {leads.length === 0 ? (
          <div style={{ padding: 20 }} className="empty">
            No leads yet. <Link href="/imports/new">Import a CSV</Link> to get started.
          </div>
        ) : (
          <table className="lead-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 22 }}>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Source</th>
                <th>Score</th>
                <th>Band</th>
                {showConfidence && <th>Confidence</th>}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td style={{ paddingLeft: 22 }}>
                    <Link href={topFive ? `/leads/${l.id}?from=top-5` : `/leads/${l.id}`}>
                      {[l.firstName, l.lastName].filter(Boolean).join(" ") || "(no name)"}
                    </Link>
                  </td>
                  <td>{l.email ?? "—"}</td>
                  <td>{l.phone ?? "—"}</td>
                  <td>{l.leadType}</td>
                  <td>{l.source ?? "—"}</td>
                  <td className="score-cell">{l.score}</td>
                  <td><ScoreBadge band={l.scoreBand} /></td>
                  {showConfidence && (
                    <td>
                      {l.confidence ? (
                        <ConfidenceBadge
                          level={l.confidence}
                          reason={l.confidenceReason}
                          variant="compact"
                        />
                      ) : (
                        <span style={{ color: "var(--ink-mute)" }}>—</span>
                      )}
                    </td>
                  )}
                  <td style={{ color: "var(--ink-soft)" }}>{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!topFive && totalCount > PAGE_SIZE && (
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>
            Page {pageNum} of {totalPages}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {hasPrev ? (
              <Link className="btn" href={pageHref(pageNum - 1)}>
                ← Previous
              </Link>
            ) : (
              <span className="btn" style={{ opacity: 0.4, pointerEvents: "none" }}>
                ← Previous
              </span>
            )}
            {hasNext ? (
              <Link className="btn" href={pageHref(pageNum + 1)}>
                Next →
              </Link>
            ) : (
              <span className="btn" style={{ opacity: 0.4, pointerEvents: "none" }}>
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
