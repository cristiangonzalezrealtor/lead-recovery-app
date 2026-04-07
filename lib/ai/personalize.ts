// AI personalization layer — "template + AI merge" per the PRD.
//
// Phase 2 ships with a deterministic stub that:
//   1. Resolves handlebars merge tokens (firstName, agentName, etc.)
//   2. Resolves {{#brokerage}}…{{/brokerage}} conditional sections
//   3. Applies a light tone adjustment
//   4. Validates output (length caps, required tokens, banned phrases)
//
// Swap the body of personalize() with a real LLM call later — the
// validation step is the guardrail that protects the pipeline.

import type { BrandProfile, Lead } from "@prisma/client";

export interface PersonalizeInput {
  subjectTemplate: string;
  bodyTemplate: string;
  aiInstructions?: string | null;
  lead: Pick<Lead, "firstName" | "lastName" | "leadType" | "tags" | "source">;
  brand: Pick<BrandProfile, "agentName" | "brokerage" | "marketCity" | "marketState" | "tone">;
}

export interface PersonalizeOutput {
  subject: string;
  body: string;
  warnings: string[];
}

const BANNED_PHRASES = [
  /\bguarantee(d)?\s+(sale|price|offer)/i,
  /\brisk[-\s]?free\b/i,
  /\bact now\b/i,
  /\blimited time\b/i,
];

const MAX_SUBJECT_LEN = 120;
const MAX_BODY_LEN = 1800;

function resolveConditional(template: string, key: string, value?: string | null): string {
  const re = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{\\/${key}\\}\\}`, "g");
  return template.replace(re, value ? "$1" : "");
}

function resolveTokens(template: string, data: Record<string, string | null | undefined>): string {
  let out = template;
  for (const [k, v] of Object.entries(data)) {
    out = resolveConditional(out, k, v ?? null);
  }
  return out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = data[key];
    return v ?? "";
  });
}

function stripLeftoverTokens(s: string): { result: string; leftover: string[] } {
  const leftover: string[] = [];
  const result = s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    leftover.push(key);
    return "";
  });
  return { result, leftover };
}

export function personalize(input: PersonalizeInput): PersonalizeOutput {
  const warnings: string[] = [];

  const data: Record<string, string | null> = {
    firstName: input.lead.firstName ?? "there",
    lastName: input.lead.lastName ?? "",
    agentName: input.brand.agentName,
    brokerage: input.brand.brokerage ?? null,
    marketCity: input.brand.marketCity ?? "your area",
    marketState: input.brand.marketState ?? "",
  };

  // 1. Merge tokens
  let subject = resolveTokens(input.subjectTemplate, data);
  let body = resolveTokens(input.bodyTemplate, data);

  // 2. Strip any leftover tokens (and warn)
  const s = stripLeftoverTokens(subject); subject = s.result;
  const b = stripLeftoverTokens(body); body = b.result;
  if (s.leftover.length) warnings.push(`Unresolved subject tokens: ${s.leftover.join(", ")}`);
  if (b.leftover.length) warnings.push(`Unresolved body tokens: ${b.leftover.join(", ")}`);

  // 3. Light tone normalization — trim whitespace, collapse blank runs.
  subject = subject.trim().replace(/\s+/g, " ");
  body = body.trim().replace(/\n{3,}/g, "\n\n");

  // 4. Validate
  if (subject.length > MAX_SUBJECT_LEN) {
    warnings.push(`Subject truncated from ${subject.length} to ${MAX_SUBJECT_LEN}`);
    subject = subject.slice(0, MAX_SUBJECT_LEN - 1) + "…";
  }
  if (body.length > MAX_BODY_LEN) {
    warnings.push(`Body truncated from ${body.length} to ${MAX_BODY_LEN}`);
    body = body.slice(0, MAX_BODY_LEN - 1) + "…";
  }
  for (const re of BANNED_PHRASES) {
    if (re.test(subject) || re.test(body)) {
      warnings.push(`Contains banned phrase: ${re}`);
    }
  }

  return { subject, body, warnings };
}
