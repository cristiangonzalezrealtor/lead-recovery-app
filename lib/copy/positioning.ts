// Single source of truth for product positioning voice.
//
// LeadRevive AI is a lead recovery system for solo real estate agents.
// It is NOT a CRM, NOT an automation platform, NOT an AI email tool.
//
// Every user-facing copy string should pull from APPROVED_LANGUAGE
// or at least follow its voice. BANNED_PHRASES is a checklist for
// code review — if any of these appear in a UI component, the copy
// is off-positioning and should be rewritten.

export const APPROVED_LANGUAGE = {
  // Core positioning
  product: "lead recovery system",
  promise: "know who to contact next",
  painPoint: "deals hiding in your database",

  // Action verbs
  recover: "recover",
  revive: "revive old leads",
  rescue: "rescue paid leads",

  // Outcome phrases
  nextBestAction: "next best action",
  workMissedOpportunities: "work missed opportunities",
  bringBackDormant: "bring old leads back into active conversations",
  makeSureNothingMissed: "make sure new leads don't get missed",
};

/**
 * Phrases that must never appear in user-facing copy.
 * This is a code review checklist, not a runtime validator.
 */
export const BANNED_PHRASES: string[] = [
  // CRM language
  "AI CRM",
  "CRM replacement",
  "replace your CRM",

  // Platform / workflow bloat
  "automation platform",
  "workflow automation",
  "marketing automation",
  "pipeline management",
  "sales enablement platform",
  "end-to-end platform",

  // AI as a feature (we use AI as a tool, not as positioning)
  "AI-powered",
  "powered by AI",
  "AI agent",
  "AI email platform",
  "AI assistant",

  // Generic SaaS fluff
  "game-changing",
  "revolutionary",
  "cutting-edge",
  "next-gen",
  "seamlessly",
  "leverage",
  "synergy",
];

/**
 * Preferred alternatives for common off-positioning phrases.
 * Use this when auditing and fixing copy.
 */
export const REWRITE_MAP: Record<string, string> = {
  "AI CRM": "lead recovery system",
  "CRM replacement": "sits beside your CRM",
  "automation platform": "daily action list",
  "workflow automation": "daily workflow",
  "AI-powered": "",
  "powered by AI": "",
  "marketing platform": "lead recovery system",
  "sales platform": "lead recovery system",
  "leverage": "use",
  "seamlessly": "",
};
