import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { PostImportDigest } from "@/lib/core/import/digest";
import { MetricTile } from "@/components/results/MetricTile";
import { BestOpportunity } from "@/components/results/BestOpportunity";
import { StartHereCard } from "@/components/results/StartHereCard";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: { importId: string };
}) {
  const user = await requireUser();

  const importRow = await prisma.import.findFirst({
    where: { id: params.importId, userId: user.id },
  });
  if (!importRow) notFound();

  // Loading state — digest not ready yet (shouldn't happen in practice
  // because commit computes it synchronously, but it handles the race
  // and lets us move digest to a worker later without changing this UI).
  if (!importRow.digest || !importRow.digestReadyAt) {
    return (
      <div className="results">
        <div className="results-loading">
          <div className="spinner" />
          <h1>Analyzing your database…</h1>
          <p>
            Scoring every lead, identifying dormant opportunities, and finding
            hidden deals. This usually takes a few seconds.
          </p>
        </div>
        {/* Auto-refresh every 2s while processing */}
        <meta httpEquiv="refresh" content="2" />
      </div>
    );
  }

  const digest = importRow.digest as unknown as PostImportDigest;

  const hasHot = digest.metrics.hotLeads.count > 0;
  const hasMissed = digest.metrics.missedOpportunities.count > 0;
  const needsAttention =
    digest.metrics.hotLeads.count +
    digest.metrics.missedOpportunities.count +
    digest.metrics.reviveWorthyDormant.count;

  return (
    <div className="results">
      {/* ── Import summary banner (Step 8) ─────────────────── */}
      <div className="import-summary-banner">
        <div className="import-summary-check">✓</div>
        <div className="import-summary-body">
          <div className="import-summary-headline">
            <strong>{digest.totalImported} leads imported</strong>
          </div>
          <div className="import-summary-detail">
            <strong className="needs-attention">
              {needsAttention} need your attention right now
            </strong>
            {digest.missingContactInfoCount > 0 && (
              <> · {digest.missingContactInfoCount} missing contact info</>
            )}
            {digest.rejectedCount > 0 && (
              <> · {digest.rejectedCount} rows skipped</>
            )}
          </div>
        </div>
      </div>

      {/* ── Headline ───────────────────────────────────────── */}
      <div className="results-headline">
        <div className="check">✓</div>
        <h1>We analyzed your database.</h1>
        <p className="emotional">
          There are deals hiding in your database right now.
        </p>
        <p className="filename">
          {digest.totalImported} leads imported from {digest.filename}
        </p>
      </div>

      {/* ── Metric tiles ───────────────────────────────────── */}
      <div className="results-metrics">
        <MetricTile metric={digest.metrics.hotLeads} urgent={hasHot} />
        <MetricTile metric={digest.metrics.reviveWorthyDormant} />
        <MetricTile
          metric={digest.metrics.missedOpportunities}
          urgent={hasMissed}
        />
        <MetricTile metric={digest.metrics.readyToNurture} />
      </div>

      {digest.missingContactInfoCount > 0 && (
        <div className="results-inline-note">
          {digest.missingContactInfoCount} lead
          {digest.missingContactInfoCount === 1 ? " is" : "s are"} missing
          contact info you can recover
        </div>
      )}

      {/* ── Best opportunity lead ──────────────────────────── */}
      {digest.bestOpportunity && (
        <BestOpportunity lead={digest.bestOpportunity} />
      )}

      {/* ── Start Here ─────────────────────────────────────── */}
      <div className="start-here">
        <div className="start-here-header">
          <h2>Start Here</h2>
          <p>Pick the one that moves a deal forward fastest.</p>
        </div>
        {digest.startHere.map((action, i) => (
          <StartHereCard key={i} action={action} />
        ))}
      </div>

      {/* ── Footer CTAs ────────────────────────────────────── */}
      <div className="results-footer">
        <Link className="btn primary" href="/leads?filter=top-5">
          Start with your Top 5 Leads
        </Link>
        <Link className="btn" href="/dashboard">
          Open Dashboard
        </Link>
      </div>

      {digest.rejectedCount > 0 && (
        <Link
          className="rejected-ghost"
          href={`/imports/${digest.importId}`}
        >
          {digest.rejectedCount} rows were rejected — review
        </Link>
      )}
    </div>
  );
}
