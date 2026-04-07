// Render a single SequenceSend: merge template, apply AI personalization,
// rewrite links for click-tracking, embed an open pixel, and append the
// legally-required unsubscribe link.

import { personalize } from "@/lib/ai/personalize";
import { signTrackingToken } from "@/lib/email/sign";
import type { BrandProfile, Lead, SequenceStep, User } from "@prisma/client";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/g;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rewriteClickLinks(
  text: string,
  sendId: string,
  leadId: string
): { rewritten: string } {
  const rewritten = text.replace(URL_RE, (url) => {
    const token = signTrackingToken({ sendId, leadId, kind: "click", url });
    return `${APP_URL}/api/tracking/click/${token}`;
  });
  return { rewritten };
}

export interface RenderArgs {
  step: SequenceStep;
  lead: Lead;
  brand: BrandProfile;
  user: Pick<User, "email">;
  sendId: string;
}

export interface RenderedEmail {
  subject: string;
  textBody: string;
  htmlBody: string;
  fromLine: string;
  replyTo: string;
  warnings: string[];
}

export function renderSend(args: RenderArgs): RenderedEmail {
  const { step, lead, brand, user, sendId } = args;

  // 1. Personalize (merge + AI stub + validate)
  const personalized = personalize({
    subjectTemplate: step.subjectTemplate,
    bodyTemplate: step.bodyTemplate,
    aiInstructions: step.aiInstructions,
    lead,
    brand,
  });

  // 2. Rewrite bare URLs in the text body for click tracking
  const click = rewriteClickLinks(personalized.body, sendId, lead.id);

  // 3. Build signed unsubscribe URL
  const unsubToken = signTrackingToken({
    leadId: lead.id,
    kind: "unsubscribe",
  });
  const unsubUrl = `${APP_URL}/api/unsubscribe/${unsubToken}`;

  // 4. Text body gets a plain-text footer
  const textBody =
    click.rewritten.trimEnd() +
    `\n\n---\nDon't want these emails? Unsubscribe: ${unsubUrl}`;

  // 5. Open pixel for HTML
  const openToken = signTrackingToken({
    sendId,
    leadId: lead.id,
    kind: "open",
  });
  const pixel = `<img src="${APP_URL}/api/tracking/open/${openToken}" width="1" height="1" style="display:none" alt="" />`;

  // 6. HTML body: paragraphs, linkify, footer with unsubscribe
  const paragraphs = click.rewritten
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  const linkified = paragraphs.replace(
    /(https?:\/\/[^\s<"']+)/g,
    '<a href="$1">$1</a>'
  );
  const htmlFooter = `<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0 12px" />
<p style="font-size:11px;color:#a8a29e;margin:0">
Don't want these emails?
<a href="${unsubUrl}" style="color:#57534e;text-decoration:underline">Unsubscribe</a>
</p>`;
  const htmlBody = `<div style="font-family:ui-sans-serif,Inter,Arial,sans-serif;font-size:14px;line-height:1.6;color:#1c1917;max-width:560px">${linkified}${htmlFooter}${pixel}</div>`;

  // 7. Identity — fromName = brand.agentName, replyTo = user.email
  const fromDomain = process.env.RESEND_FROM_DOMAIN || "onboarding@resend.dev";
  const cleanName = brand.agentName.replace(/["<>]/g, "").trim();
  const fromLine = `${cleanName} <${fromDomain}>`;

  return {
    subject: personalized.subject,
    textBody,
    htmlBody,
    fromLine,
    replyTo: user.email,
    warnings: personalized.warnings,
  };
}
