// Commits a previously-parsed CSV preview into the database.
// For each row we:
//   1. Create the Lead row with status = classified (or archived if dormant flag)
//   2. Run the scoring engine → transitions status to "scored"
//   3. Run enrichLead() → revival, next action, AI summary

import { prisma } from "@/lib/db";
import { rescoreLead } from "@/lib/core/scoring/persist";
import { enrichLead } from "@/lib/core/enrich";
import { onImport } from "@/lib/core/status/transitions";
import { computePostImportDigest } from "./digest";
import { markOnboardingStep } from "@/lib/core/onboarding/mark";
import type { ParsePreview, ParsedRow } from "./csv";
import type { LeadType, EmailStatus, PhoneStatus } from "@prisma/client";

interface CommitOptions {
  userId: string;
  filename: string;
  markAsDormant: boolean; // adjustment #5
}

/**
 * Derive a sensible source name from the filename when the CSV has no
 * source column. "vortex (2).csv" → "Vortex", "followup_boss_export.csv" →
 * "Followup Boss", etc. Makes imported leads feel like they have real
 * provenance instead of a blank "—" column.
 */
function deriveSourceFromFilename(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "") // strip extension
    .replace(/[\s_\-]*\(\d+\)\s*$/, "") // strip " (1)", "_(2)", etc.
    .replace(/[_\-]+/g, " ") // underscores → spaces
    .trim();
  if (!base) return "CSV import";
  // Title-case each word
  return base
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function coerceEmailStatus(email?: string | null): EmailStatus | null {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "valid" : "invalid";
}

function coercePhoneStatus(phone?: string | null): PhoneStatus | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return "valid";
  if (digits.length === 0) return "unknown";
  return "invalid";
}

export async function commitImport(
  preview: ParsePreview,
  opts: CommitOptions
) {
  const acceptedRows = preview.allRows.filter((r) => r.errors.length === 0);
  const rejectedRows = preview.allRows.filter((r) => r.errors.length > 0);

  const fallbackSource = deriveSourceFromFilename(opts.filename);

  const importRecord = await prisma.import.create({
    data: {
      userId: opts.userId,
      filename: opts.filename,
      rowCount: preview.totalRows,
      acceptedCount: acceptedRows.length,
      rejectedCount: rejectedRows.length,
      duplicateCount: preview.duplicateRows,
      markAsDormant: opts.markAsDormant,
      status: "committed",
      committedAt: new Date(),
    },
  });

  const createdLeadIds: string[] = [];

  for (const row of acceptedRows) {
    if (row.email) {
      const exists = await prisma.lead.findUnique({
        where: { userId_email: { userId: opts.userId, email: row.email } },
      });
      if (exists) {
        await prisma.importRow.create({
          data: {
            importId: importRecord.id,
            raw: row.raw,
            errorText: "Duplicate of existing lead",
          },
        });
        continue;
      }
    }

    // Status pipeline: new → classified (via onImport helper).
    const initialStatus = onImport("new", opts.markAsDormant);

    const lead = await prisma.lead.create({
      data: {
        userId: opts.userId,
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        email: row.email || null,
        phone: row.phone || null,
        leadType: (row.leadType as LeadType) ?? "buyer",
        source: row.source || fallbackSource,
        intentSignal: row.intentSignal || null,
        timeframeDays: row.timeframeDays ?? null,
        tags: row.tags
          ? row.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean)
          : [],
        importedFromId: importRecord.id,
        status: initialStatus,
        isDormant: opts.markAsDormant,
        emailStatus: coerceEmailStatus(row.email),
        phoneStatus: coercePhoneStatus(row.phone),
      },
    });

    await prisma.importRow.create({
      data: {
        importId: importRecord.id,
        raw: row.raw,
        leadId: lead.id,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "import",
        payload: { importId: importRecord.id },
      },
    });

    createdLeadIds.push(lead.id);
  }

  // Record rejected rows for the import history screen.
  for (const row of rejectedRows) {
    await prisma.importRow.create({
      data: {
        importId: importRecord.id,
        raw: row.raw,
        errorText: row.errors.join("; "),
      },
    });
  }

  // Score + enrich every created lead.
  for (const id of createdLeadIds) {
    await rescoreLead(id);
    await enrichLead(id);
  }

  // Compute and cache the post-import digest for the Results screen.
  await computePostImportDigest(opts.userId, importRecord.id);

  // Mark onboarding — "Upload your leads" is now satisfied.
  await markOnboardingStep(opts.userId, "leadsImported");

  return {
    importId: importRecord.id,
    accepted: createdLeadIds.length,
    rejected: rejectedRows.length,
    duplicates: preview.duplicateRows,
  };
}
