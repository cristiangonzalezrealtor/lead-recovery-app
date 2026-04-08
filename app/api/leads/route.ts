// POST /api/leads — manually create a single lead.
//
// Mirrors what the CSV import path does for one row:
//   1. Validate fields (email or phone required)
//   2. Reject duplicate (same email + same user)
//   3. Create the lead with initial status "classified"
//   4. Run scoring + enrichment
//   5. Mark the "leadsImported" onboarding step

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rescoreLead } from "@/lib/core/scoring/persist";
import { enrichLead } from "@/lib/core/enrich";
import { onImport } from "@/lib/core/status/transitions";
import { markOnboardingStep } from "@/lib/core/onboarding/mark";

const Body = z
  .object({
    firstName: z.string().trim().max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
    email: z
      .string()
      .trim()
      .email("Email format looks off")
      .optional()
      .or(z.literal("")),
    phone: z.string().trim().max(40).optional(),
    leadType: z.enum([
      "seller",
      "buyer",
      "investor",
      "rental",
      "valuation",
      "dormant",
    ]),
    source: z.string().trim().max(80).optional(),
    intentSignal: z.string().trim().max(2000).optional(),
    timeframeDays: z.coerce.number().int().nonnegative().max(3650).optional(),
    addressStreet: z.string().trim().max(200).optional(),
    addressCity: z.string().trim().max(120).optional(),
    addressState: z.string().trim().max(80).optional(),
    addressZip: z.string().trim().max(20).optional(),
    markAsDormant: z.boolean().optional(),
  })
  .refine((d) => !!d.email || !!d.phone, {
    message: "Provide an email or a phone number.",
    path: ["email"],
  });

function coerceEmailStatus(email?: string | null) {
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "valid" : "invalid";
}

function coercePhoneStatus(phone?: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) return "valid";
  if (digits.length === 0) return "unknown";
  return "invalid";
}

export async function POST(req: Request) {
  const user = await requireUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const email = data.email && data.email.length > 0 ? data.email : null;

  // Duplicate check (only meaningful when an email is provided).
  if (email) {
    const existing = await prisma.lead.findUnique({
      where: { userId_email: { userId: user.id, email } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A lead with this email already exists.", leadId: existing.id },
        { status: 409 }
      );
    }
  }

  const initialStatus = onImport("new", !!data.markAsDormant);

  const lead = await prisma.lead.create({
    data: {
      userId: user.id,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      email,
      phone: data.phone || null,
      leadType: data.leadType,
      source: data.source || "Manual entry",
      intentSignal: data.intentSignal || null,
      timeframeDays: data.timeframeDays ?? null,
      addressStreet: data.addressStreet || null,
      addressCity: data.addressCity || null,
      addressState: data.addressState || null,
      addressZip: data.addressZip || null,
      tags: [],
      status: initialStatus,
      isDormant: !!data.markAsDormant,
      emailStatus: coerceEmailStatus(email),
      phoneStatus: coercePhoneStatus(data.phone),
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "import",
      payload: { manual: true },
    },
  });

  await rescoreLead(lead.id);
  await enrichLead(lead.id);
  await markOnboardingStep(user.id, "leadsImported");

  return NextResponse.json({ ok: true, leadId: lead.id });
}
