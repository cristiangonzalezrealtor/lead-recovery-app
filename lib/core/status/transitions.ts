// Lead status transition rules.
//
// Two pipelines:
//   Outbound: new → classified → scored → nurturing
//   Inbound:  replied → engaged → appointment_set
//
// Terminal states cannot be transitioned automatically:
//   unsubscribed, bounced, archived, active_client

import type { LeadStatus } from "@prisma/client";

const TERMINAL: LeadStatus[] = [
  "unsubscribed",
  "bounced",
  "archived",
  "active_client",
];

export function isTerminal(status: LeadStatus): boolean {
  return TERMINAL.includes(status);
}

/** Transition applied when a lead is first written to the DB from an import. */
export function onImport(current: LeadStatus, markAsDormant: boolean): LeadStatus {
  if (isTerminal(current)) return current;
  if (markAsDormant) return "archived";
  return "classified";
}

/** Transition applied after the scoring engine finishes. */
export function onScore(current: LeadStatus): LeadStatus {
  if (isTerminal(current)) return current;
  if (current === "new" || current === "classified") return "scored";
  return current;
}

/** Transition applied when a lead is enrolled in an active sequence. */
export function onEnroll(current: LeadStatus): LeadStatus {
  if (isTerminal(current)) return current;
  if (["new", "classified", "scored"].includes(current)) return "nurturing";
  return current;
}

/** Transition applied on an inbound reply activity. */
export function onReply(current: LeadStatus): LeadStatus {
  if (isTerminal(current)) return current;
  return "replied";
}

/** Transition applied on an open/click after the lead has already replied. */
export function onEngagement(current: LeadStatus): LeadStatus {
  if (isTerminal(current)) return current;
  if (current === "replied") return "engaged";
  return current;
}

/** Explicit manual transition when an appointment is booked. */
export function onAppointment(current: LeadStatus): LeadStatus {
  if (isTerminal(current)) return current;
  return "appointment_set";
}
