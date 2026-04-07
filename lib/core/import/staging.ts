// In-memory staging store for parsed previews.
// Phase 1 only — replace with Redis or a DB-backed staging table later.

import type { ParsePreview } from "./csv";
import { randomBytes } from "crypto";

interface StagedImport {
  userId: string;
  filename: string;
  preview: ParsePreview;
  createdAt: number;
}

const globalStore = globalThis as unknown as { __import_staging?: Map<string, StagedImport> };
if (!globalStore.__import_staging) globalStore.__import_staging = new Map();
const store = globalStore.__import_staging!;

const TTL_MS = 1000 * 60 * 30;

export function stage(userId: string, filename: string, preview: ParsePreview): string {
  const id = randomBytes(12).toString("hex");
  store.set(id, { userId, filename, preview, createdAt: Date.now() });
  // Best-effort GC
  for (const [key, value] of store.entries()) {
    if (Date.now() - value.createdAt > TTL_MS) store.delete(key);
  }
  return id;
}

export function getStaged(id: string, userId: string): StagedImport | null {
  const hit = store.get(id);
  if (!hit || hit.userId !== userId) return null;
  return hit;
}

export function dropStaged(id: string) {
  store.delete(id);
}
