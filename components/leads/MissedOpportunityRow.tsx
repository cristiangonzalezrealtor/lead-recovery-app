"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@prisma/client";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { durationOf, timeAgo } from "@/lib/core/dashboard/time";

export interface MissedRowLead extends Lead {
  /* helpful client-side fields, all already present on Lead */
}

interface Props {
  lead: MissedRowLead;
  detailed?: boolean; // critical-tier full card vs condensed row
}

const KIND_PRIMARY: Record<string, "call" | "reply" | "open"> = {
  hot_no_contact: "call",
  hot_stale: "call",
  click_no_followup: "reply",
  warm_repeated_opens: "reply",
  sequence_stalled: "open",
};

export function MissedOpportunityRow({ lead, detailed = false }: Props) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  const name =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
    lead.email ||
    "Lead";

  const severity = lead.missedOpportunitySeverity ?? "high";
  const kind = lead.missedOpportunityKind ?? "hot_stale";
  const since = lead.missedOpportunitySince ?? lead.updatedAt;
  const silenceLabel = durationOf(Date.now() - since.getTime());
  const missedAgo = timeAgo(since);

  const primaryKind = KIND_PRIMARY[kind] ?? "open";
  const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\s+/g, "")}` : null;
  const replyHref = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent("Following up")}`
    : null;

  async function handleMarkHandled() {
    setRemoving(true);
    await fetch(`/api/leads/${lead.id}/missed-opportunity/handle`, {
      method: "POST",
    });
    // Wait for the fade/collapse animation, then hide locally + refresh.
    setTimeout(() => {
      setHidden(true);
      router.refresh();
    }, 320);
  }

  const primaryButton = (() => {
    if (primaryKind === "call" && phoneHref) {
      return (
        <a className="btn primary" href={phoneHref}>
          Call now
        </a>
      );
    }
    if (primaryKind === "reply" && replyHref) {
      return (
        <a className="btn primary" href={replyHref}>
          Reply
        </a>
      );
    }
    return (
      <Link className="btn primary" href={`/leads/${lead.id}`}>
        Open lead
      </Link>
    );
  })();

  return (
    <div
      className={`missed-row missed-${severity} ${detailed ? "detailed" : ""} ${
        removing ? "removing" : ""
      }`}
    >
      <div className="missed-row-head">
        <div className="missed-row-name-block">
          <Link href={`/leads/${lead.id}`} className="missed-row-name">
            {severity === "medium" ? "◐" : "⚠"} {name}
          </Link>
          <div className="missed-row-tags">
            <span className={`missed-tag tag-${severity}`}>
              {severity}
              {severity === "medium" ? " · opportunity building" : ""}
            </span>
            <span className="missed-tag-silence">SILENT FOR {silenceLabel}</span>
            <span className="missed-tag-ago">· Missed {missedAgo}</span>
          </div>
        </div>
      </div>

      <div className="missed-row-reason">
        {lead.missedOpportunityReason ?? "Hot lead has gone quiet"}
      </div>

      <div className="missed-row-meta">
        {lead.leadType}
        {lead.source && ` · ${lead.source}`} · Scored {lead.score}
        {lead.confidence && (
          <>
            {" · "}
            <ConfidenceBadge
              level={lead.confidence}
              reason={lead.confidenceReason}
              variant="compact"
            />
          </>
        )}
      </div>

      {detailed && lead.nextAction && (
        <div className="missed-row-next">
          <div className="missed-row-next-label">Recommended next action:</div>
          <div className="missed-row-next-action">→ {lead.nextAction}</div>
          {lead.nextActionReason && (
            <div className="missed-row-next-reason">{lead.nextActionReason}</div>
          )}
        </div>
      )}

      <div className="missed-row-actions">
        {primaryButton}
        <Link className="btn" href={`/leads/${lead.id}`}>
          Open lead
        </Link>
        <button
          className="btn ghost"
          onClick={handleMarkHandled}
          disabled={removing}
          title="This removes it for now. We'll check again later."
        >
          {removing ? "Marking…" : "Mark as handled"}
        </button>
      </div>
      {detailed && (
        <div className="missed-row-reassurance">
          Mark as handled removes it for now. We&rsquo;ll check again later.
        </div>
      )}
    </div>
  );
}
