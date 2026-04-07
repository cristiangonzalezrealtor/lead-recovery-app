// Seeds the 18 built-in sequence templates into the database.
//
// Idempotent: skips any template whose name already exists. Safe to call
// multiple times. Designed to be triggered from the Sequences page when
// the library is empty (replaces having to SSH into Render and run
// `npm run db:seed`).
//
// Auth: requires a signed-in user. Anyone can trigger it because the
// templates are global (userId = null) and the operation is read-only
// for any data that already exists.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TEMPLATES } from "@/prisma/seeds/sequences";

export async function POST() {
  await requireUser();

  let created = 0;
  let skipped = 0;

  for (const tpl of TEMPLATES) {
    const existing = await prisma.sequence.findFirst({
      where: { name: tpl.name, isTemplate: true, userId: null },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.sequence.create({
      data: {
        name: tpl.name,
        leadType: tpl.leadType,
        tone: tpl.tone,
        ctaGoal: tpl.ctaGoal,
        isTemplate: true,
        isActive: true,
        steps: {
          create: tpl.steps.map((s, i) => ({
            stepIndex: i,
            dayOffset: tpl.cadence[i] ?? 0,
            channel: "email",
            subjectTemplate: s.subject,
            bodyTemplate: s.body,
            aiInstructions: s.aiInstructions,
            stopRules: {
              pauseOn: ["reply"],
              stopOn: ["unsubscribe", "bounce"],
            },
          })),
        },
      },
    });
    created++;
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    total: TEMPLATES.length,
  });
}
