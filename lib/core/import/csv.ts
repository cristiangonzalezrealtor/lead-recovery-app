// CSV parsing + validation + preview.
//
// Two-phase: parse() produces a preview (no DB writes),
// commit() writes Lead rows and triggers scoring.
//
// Step 8 additions:
//   • Full-name detection (single column → split on first space)
//   • Optional caller-supplied column mapping (manual override)
//   • Row severity: ok | warning | error
//     - warning rows still import (missing one of email/phone or name)
//     - error rows are skipped (missing both email AND phone)
//   • Tolerant of more header variants

import Papa from "papaparse";
import { z } from "zod";
import type { LeadType } from "@prisma/client";

// ── Column aliases ───────────────────────────────────────────────────
const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ["first name", "first", "fname", "given name", "first nm"],
  lastName: [
    "last name",
    "last",
    "lname",
    "surname",
    "family name",
    "last nm",
  ],
  fullName: [
    "name",
    "full name",
    "contact name",
    "lead name",
    "full",
    "contact",
  ],
  email: [
    "email",
    "email address",
    "e-mail",
    "mail",
    "email addr",
    "email 1",
    "primary email",
  ],
  phone: [
    "phone",
    "phone number",
    "mobile",
    "cell",
    "telephone",
    "mobile phone",
    "cell phone",
    "tel",
    "phone 1",
    "primary phone",
    "home phone",
    "work phone",
  ],
  leadType: ["lead type", "category", "client type", "contact type"],
  source: [
    "source",
    "lead source",
    "origin",
    "channel",
    "from",
    "list source",
  ],
  intentSignal: [
    "notes",
    "comments",
    "intent",
    "message",
    "note",
    "remarks",
    "description",
  ],
  timeframeDays: [
    "timeframe",
    "timeline",
    "days",
    "horizon",
    "days on market",
  ],
  tags: ["tags", "labels"],
  addressStreet: [
    "address",
    "street",
    "street address",
    "property address",
    "address 1",
    "address line 1",
    "addr",
    "mailing address",
  ],
  addressCity: ["city", "town", "municipality"],
  addressState: ["state", "province", "st", "region"],
  addressZip: [
    "zip",
    "zip code",
    "postal",
    "postal code",
    "postcode",
    "zip4",
  ],
};

export type FieldKey = keyof typeof FIELD_ALIASES;

function normalize(header: string): string {
  return header.trim().toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ");
}

function buildHeaderMap(
  headers: string[],
  manualMapping?: Record<string, string>
): Record<string, number> {
  const map: Record<string, number> = {};

  // Auto-detection pass
  headers.forEach((h, i) => {
    const n = normalize(h);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(n) && map[field] === undefined) {
        map[field] = i;
      }
    }
  });

  // Manual override pass
  if (manualMapping) {
    for (const [field, header] of Object.entries(manualMapping)) {
      if (!header) continue;
      const idx = headers.findIndex((h) => h === header);
      if (idx >= 0) map[field] = idx;
    }
  }

  return map;
}

// ── Row schema ───────────────────────────────────────────────────────
const RowSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  leadType: z
    .enum(["seller", "buyer", "investor", "rental", "valuation", "dormant"])
    .optional(),
  source: z.string().trim().optional(),
  intentSignal: z.string().trim().optional(),
  timeframeDays: z.coerce.number().int().nonnegative().optional(),
  tags: z.string().optional(),
  addressStreet: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().optional(),
  addressZip: z.string().trim().optional(),
});

export type RowSeverity = "ok" | "warning" | "error";

export type ParsedRow = z.infer<typeof RowSchema> & {
  rowIndex: number;
  raw: Record<string, string>;
  errors: string[];
  warnings: string[];
  severity: RowSeverity;
  fingerprint: string;
};

export interface ParsePreview {
  headers: string[];
  detectedColumns: Record<string, string>;
  unmappedHeaders: string[];
  missingCriticalFields: boolean;
  totalRows: number;
  readyRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  sample: ParsedRow[];
  allRows: ParsedRow[];
}

function fingerprint(row: Partial<ParsedRow>): string {
  const email = (row.email || "").toLowerCase().trim();
  const phone = (row.phone || "").replace(/\D/g, "");
  return email || phone || `${row.firstName ?? ""}|${row.lastName ?? ""}`;
}

function inferLeadType(raw: string | undefined): LeadType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase().trim();
  if (["seller", "listing", "home seller"].includes(v)) return "seller";
  if (["buyer", "home buyer"].includes(v)) return "buyer";
  if (["investor", "investment"].includes(v)) return "investor";
  if (["rental", "renter", "tenant"].includes(v)) return "rental";
  if (["valuation", "home value", "cma", "home valuation"].includes(v))
    return "valuation";
  return undefined;
}

function splitFullName(raw: string): { firstName: string; lastName: string } {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstName: "", lastName: "" };
  const idx = trimmed.indexOf(" ");
  if (idx < 0) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1),
  };
}

// ── parse() ──────────────────────────────────────────────────────────
export function parseCsv(
  text: string,
  manualMapping?: Record<string, string>
): ParsePreview {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const rows = result.data as string[][];

  if (rows.length === 0) {
    return {
      headers: [],
      detectedColumns: {},
      unmappedHeaders: [],
      missingCriticalFields: true,
      totalRows: 0,
      readyRows: 0,
      warningRows: 0,
      errorRows: 0,
      duplicateRows: 0,
      sample: [],
      allRows: [],
    };
  }

  const headers = rows[0].map((h) => h.trim());
  const map = buildHeaderMap(headers, manualMapping);
  const detectedColumns = Object.fromEntries(
    Object.entries(map).map(([field, idx]) => [field, headers[idx]])
  );
  const unmappedHeaders = headers.filter(
    (_, i) => !Object.values(map).includes(i)
  );

  const missingCriticalFields =
    map.email === undefined && map.phone === undefined;

  const seen = new Set<string>();
  const allRows: ParsedRow[] = [];
  let readyRows = 0;
  let warningRows = 0;
  let errorRows = 0;
  let duplicateRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const raw: Record<string, string> = {};
    headers.forEach((h, j) => (raw[h] = (cells[j] ?? "").trim()));

    // Resolve full name into first/last if applicable
    let firstNameVal: string | undefined =
      map.firstName != null ? cells[map.firstName]?.trim() : undefined;
    let lastNameVal: string | undefined =
      map.lastName != null ? cells[map.lastName]?.trim() : undefined;

    if (!firstNameVal && !lastNameVal && map.fullName != null) {
      const split = splitFullName(cells[map.fullName] ?? "");
      firstNameVal = split.firstName || undefined;
      lastNameVal = split.lastName || undefined;
    }

    const candidate = {
      firstName: firstNameVal,
      lastName: lastNameVal,
      email: map.email != null ? cells[map.email]?.trim() : undefined,
      phone: map.phone != null ? cells[map.phone]?.trim() : undefined,
      leadType: inferLeadType(
        map.leadType != null ? cells[map.leadType] : undefined
      ),
      source: map.source != null ? cells[map.source]?.trim() : undefined,
      intentSignal:
        map.intentSignal != null ? cells[map.intentSignal]?.trim() : undefined,
      timeframeDays:
        map.timeframeDays != null ? cells[map.timeframeDays]?.trim() : undefined,
      tags: map.tags != null ? cells[map.tags]?.trim() : undefined,
      addressStreet:
        map.addressStreet != null ? cells[map.addressStreet]?.trim() : undefined,
      addressCity:
        map.addressCity != null ? cells[map.addressCity]?.trim() : undefined,
      addressState:
        map.addressState != null ? cells[map.addressState]?.trim() : undefined,
      addressZip:
        map.addressZip != null ? cells[map.addressZip]?.trim() : undefined,
    };

    const parsed = RowSchema.safeParse(candidate);
    const errors: string[] = [];
    const warnings: string[] = [];
    let data: Partial<ParsedRow> = candidate as Partial<ParsedRow>;

    if (!parsed.success) {
      // Treat invalid email as a warning, not a hard error.
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "email") {
          warnings.push("Email format looks off — we'll still import");
        } else {
          errors.push(`${issue.path.join(".")}: ${issue.message}`);
        }
      }
    } else {
      data = parsed.data;
    }

    const hasEmail = !!data.email;
    const hasPhone = !!data.phone;
    const hasName = !!(data.firstName || data.lastName);

    if (!hasEmail && !hasPhone) {
      errors.push("Missing email AND phone — can't reach this lead");
    } else {
      if (!hasEmail) warnings.push("Missing email — we'll import anyway");
      if (!hasPhone) warnings.push("Missing phone — we'll import anyway");
      if (!hasName) warnings.push("Missing name — we'll use email instead");
    }

    const fp = fingerprint(data);
    const isDupe = !!fp && seen.has(fp);
    if (fp) seen.add(fp);
    if (isDupe) {
      errors.push("Duplicate of an earlier row");
      duplicateRows++;
    }

    let severity: RowSeverity;
    if (errors.length > 0) severity = "error";
    else if (warnings.length > 0) severity = "warning";
    else severity = "ok";

    if (severity === "error") {
      errorRows++;
    } else {
      readyRows++;
      if (severity === "warning") warningRows++;
    }

    allRows.push({
      rowIndex: i,
      raw,
      errors,
      warnings,
      severity,
      fingerprint: fp,
      ...(data as object),
    } as ParsedRow);
  }

  return {
    headers,
    detectedColumns,
    unmappedHeaders,
    missingCriticalFields,
    totalRows: rows.length - 1,
    readyRows,
    warningRows,
    errorRows,
    duplicateRows,
    sample: allRows.slice(0, 10),
    allRows,
  };
}
