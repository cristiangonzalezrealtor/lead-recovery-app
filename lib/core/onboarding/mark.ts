// markOnboardingStep() — idempotent writer for onboarding checklist flags.
//
// Called from the service layer whenever a qualifying real action happens.
// Never called from UI directly. Auto-stamps completedAt when all 4 are true.

import { prisma } from "@/lib/db";

export type OnboardingStepKey =
  | "leadsImported"
  | "topLeadsReviewed"
  | "revivalCampaignStarted"
  | "sequenceEnrolled";

export async function markOnboardingStep(
  userId: string,
  step: OnboardingStepKey
): Promise<void> {
  // Upsert + set the flag. We use two round trips so we can check
  // "all 4 true" and stamp completedAt atomically.
  const row = await prisma.userOnboarding.upsert({
    where: { userId },
    create: { userId, [step]: true },
    update: { [step]: true },
  });

  const allDone =
    row.leadsImported &&
    row.topLeadsReviewed &&
    row.revivalCampaignStarted &&
    row.sequenceEnrolled;

  if (allDone && !row.completedAt) {
    await prisma.userOnboarding.update({
      where: { userId },
      data: { completedAt: new Date() },
    });
  }
}
