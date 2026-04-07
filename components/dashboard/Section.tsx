"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreBadge } from "@/components/ui/Badge";
import type { Lead } from "@prisma/client";

interface EmptyState {
  icon?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}

interface Props {
  title: string;
  question: string;
  primaryLabel?: string;
  primaryHref?: string;
  leads: Lead[];
  empty: EmptyState;
  groupLabel?: (leadId: string) => string | undefined;
}

export function DashboardSection({
  title,
  question,
  primaryLabel,
  primaryHref,
  leads,
  empty,
  groupLabel,
}: Props) {
  const router = useRouter();
  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2>{title}</h2>
          <div className="subtitle">{question}</div>
        </div>
        {primaryLabel && primaryHref && leads.length > 0 && (
          <Link className="btn" href={primaryHref}>
            {primaryLabel}
          </Link>
        )}
      </div>
      {leads.length === 0 ? (
        <div className="empty-state">
          {empty.icon && <div className="empty-state-icon">{empty.icon}</div>}
          <div className="empty-state-title">{empty.title}</div>
          <div className="empty-state-body">{empty.body}</div>
          {empty.ctaLabel && empty.ctaHref && (
            <Link className="btn" href={empty.ctaHref}>
              {empty.ctaLabel}
            </Link>
          )}
        </div>
      ) : (
        <table className="lead-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Score</th>
              <th>Band</th>
              {groupLabel && <th>Why here</th>}
              <th>Next action</th>
            </tr>
          </thead>
          <tbody>
            {leads.slice(0, 5).map((l) => (
              <tr key={l.id} onClick={() => router.push(`/leads/${l.id}`)}>
                <td>
                  <div style={{ fontWeight: 500 }}>
                    {[l.firstName, l.lastName].filter(Boolean).join(" ") ||
                      l.email ||
                      "(no name)"}
                  </div>
                  {l.nextActionPriority === "high" && (
                    <span className="badge hot" style={{ marginTop: 4, fontSize: 10 }}>Priority</span>
                  )}
                </td>
                <td>{l.leadType}</td>
                <td className="score-cell">{l.score}</td>
                <td>
                  <ScoreBadge band={l.scoreBand} />
                </td>
                {groupLabel && (
                  <td style={{ color: "var(--ink-soft)" }}>{groupLabel(l.id)}</td>
                )}
                <td style={{ color: "var(--ink-soft)", maxWidth: 320 }}>
                  <div style={{ color: "var(--ink)" }}>{l.nextAction ?? "—"}</div>
                  {l.nextActionReason && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>{l.nextActionReason}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
