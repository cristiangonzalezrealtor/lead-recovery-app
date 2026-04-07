// Onboarding state reader — a single DB read that produces the typed
// state the dashboard needs to render the checklist.
//
// Visibility rules:
//   • showCard         — card shown inline on dashboard
//   • showBanner       — soft reminder banner (after 48h dismiss grace)
//   • showCelebration  — "You're all set" moment for 24h after completion

import { prisma } from "@/lib/db";

const HOUR = 1000 * 60 * 60;
const CELEBRATION_WINDOW_MS = 24 * HOUR;
const BANNER_GRACE_MS = 48 * HOUR;

export interface OnboardingStepState {
  key: "leadsImported" | "topLeadsReviewed" | "revivalCampaignStarted" | "sequenceEnrolled";
  title: string;
  description: string;
  reinforcement?: string;
  ctaLabel: string;
  ctaHref: string;
  done: boolean;
}

export interface OnboardingState {
  leadsImported: boolean;
  topLeadsReviewed: boolean;
  revivalCampaignStarted: boolean;
  sequenceEnrolled: boolean;
  completedAt: Date | null;
  dismissedAt: Date | null;
  steps: OnboardingStepState[];
  progress: { done: number; total: number; percent: number };
  showCard: boolean;
  showBanner: boolean;
  showCelebration: boolean;
  firstIncompleteIndex: number; // -1 if all done
}

export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  const row = await prisma.userOnboarding.findUnique({ where: { userId } });

  const leadsImported = row?.leadsImported ?? false;
  const topLeadsReviewed = row?.topLeadsReviewed ?? false;
  const revivalCampaignStarted = row?.revivalCampaignStarted ?? false;
  const sequenceEnrolled = row?.sequenceEnrolled ?? false;
  const completedAt = row?.completedAt ?? null;
  const dismissedAt = row?.dismissedAt ?? null;

  const steps: OnboardingStepState[] = [
    {
      key: "leadsImported",
      title: "Upload leads",
      description: "Get your database into the system so we can analyze it.",
      ctaLabel: "Upload CSV",
      ctaHref: "/imports/new",
      done: leadsImported,
    },
    {
      key: "topLeadsReviewed",
      title: "Review your top 5 leads",
      description: "Start with the leads most likely to convert right now.",
      reinforcement: "This is the fastest way to move a deal forward.",
      ctaLabel: "Open top 5",
      ctaHref: "/leads?filter=top-5",
      done: topLeadsReviewed,
    },
    {
      key: "revivalCampaignStarted",
      title: "Start a revival campaign",
      description: "Bring old leads back into active conversations.",
      ctaLabel: "Open revival",
      ctaHref: "/revival",
      done: revivalCampaignStarted,
    },
    {
      key: "sequenceEnrolled",
      title: "Enroll a lead in a sequence",
      description: "Make sure new leads don't get missed.",
      ctaLabel: "Browse leads",
      ctaHref: "/leads",
      done: sequenceEnrolled,
    },
  ];

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = Math.round((done / total) * 100);

  const firstIncompleteIndex = steps.findIndex((s) => !s.done);

  // Celebration window: for 24h after completion, show celebratory card.
  const showCelebration =
    completedAt !== null && Date.now() - completedAt.getTime() < CELEBRATION_WINDOW_MS;

  // Determine visibility
  let showCard = false;
  let showBanner = false;

  if (completedAt !== null) {
    showCard = showCelebration;
  } else if (dismissedAt === null) {
    showCard = true;
  } else {
    // Dismissed but not complete — after 48h, start showing the soft banner.
    const dismissedAgeMs = Date.now() - dismissedAt.getTime();
    if (dismissedAgeMs >= BANNER_GRACE_MS) {
      showBanner = true;
    }
  }

  return {
    leadsImported,
    topLeadsReviewed,
    revivalCampaignStarted,
    sequenceEnrolled,
    completedAt,
    dismissedAt,
    steps,
    progress: { done, total, percent },
    showCard,
    showBanner,
    showCelebration,
    firstIncompleteIndex,
  };
}
