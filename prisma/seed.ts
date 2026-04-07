// Seeds the 18 template sequences as global templates (userId = null, isTemplate = true).
// Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { TEMPLATES } from "./seeds/sequences";

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding ${TEMPLATES.length} sequence templates…`);
  for (const tpl of TEMPLATES) {
    const existing = await prisma.sequence.findFirst({
      where: { name: tpl.name, isTemplate: true, userId: null },
    });
    if (existing) {
      console.log(`  ↷ skipping existing "${tpl.name}"`);
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
    console.log(`  ✓ ${tpl.name}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
