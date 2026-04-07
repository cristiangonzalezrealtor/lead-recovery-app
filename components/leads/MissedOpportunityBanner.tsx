"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@prisma/client";
import { durationOf } from "@/lib/core/dashboard/time";

export function MissedOpportunityBanner({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (hidden || !lead.missedOpportunity || lead.missedOpportunityHandledAt)
    return null;

  const severity = lead.missedOpportunitySeverity ?? "high";
  const since = lead.missedOpportunitySince ?? lead.updatedAt;
  const silenceLabel = durationOf(Date.now() - since.getTime());
  const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\s+/g, "")}` : null;
  const replyHref = lead.email
    ? `mailto:${lead.email}?subject=${encodeURIComponent("Following up")}`
    : null;

  async function onHandle() {
    setRemoving(true);
    await fetch(`/api/leads/${lead.id}/missed-opportunity/handle`, {
      method: "POST",
    });
    setTimeout(() => {
      setHidden(true);
      router.refresh();
    }, 320);
  }

  return (
    <div
      className={`missed-banner missed-${severity} ${removing ? "removing" : ""}`}
    >
      <div className="missed-banner-icon">
        {severity === "medium" ? "◐" : "⚠"}
      </div>
      <div className="missed-banner-body">
        <div className="missed-banner-title">
          {severity.toUpperCase()} · This deal is slipping
        </div>
        {severity === "critical" && (
          <div className="missed-banner-subtitle">
            This lead is going cold right now
          </div>
        )}
        <div className="missed-banner-detail">
          {lead.missedOpportunityReason} · silent for{" "}
          <strong>{silenceLabel}</strong>
        </div>
        {lead.nextAction && (
          <div className="missed-banner-rec">
            Recommended: <strong>{lead.nextAction}</strong>
          </div>
        )}
        <div className="missed-banner-actions">
          {phoneHref ? (
            <a className="btn primary" href={phoneHref}>
              Call now
            </a>
          ) : replyHref ? (
            <a className="btn primary" href={replyHref}>
              Reply
            </a>
          ) : null}
          <button
            className="btn"
            onClick={onHandle}
            disabled={removing}
            title="This removes it for now. We'll check again later."
          >
            {removing ? "Marking…" : "Mark as handled"}
          </button>
        </div>
        <div className="missed-banner-reassurance">
          Mark as handled removes it for now. We&rsquo;ll check again later.
        </div>
      </div>
    </div>
  );
}
