// Signed token helpers for tracking pixels, redirect links, and unsubscribe.

import { createHmac } from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-only-insecure-secret";

export interface TrackingPayload {
  sendId?: string;
  leadId: string;
  kind: "open" | "click" | "unsubscribe";
  url?: string;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signTrackingToken(payload: TrackingPayload): string {
  const json = JSON.stringify(payload);
  const data = b64urlEncode(Buffer.from(json, "utf8"));
  const sig = createHmac("sha256", SECRET).update(data).digest();
  return `${data}.${b64urlEncode(sig)}`;
}

export function verifyTrackingToken(token: string): TrackingPayload | null {
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const data = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = b64urlEncode(
    createHmac("sha256", SECRET).update(data).digest()
  );
  if (sig !== expected) return null;
  try {
    return JSON.parse(b64urlDecode(data).toString("utf8")) as TrackingPayload;
  } catch {
    return null;
  }
}
