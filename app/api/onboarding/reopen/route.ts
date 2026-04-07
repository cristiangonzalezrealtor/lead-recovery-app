import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST() {
  const user = await requireUser();
  await prisma.userOnboarding.upsert({
    where: { userId: user.id },
    create: { userId: user.id, dismissedAt: null },
    update: { dismissedAt: null },
  });
  return NextResponse.json({ ok: true });
}
