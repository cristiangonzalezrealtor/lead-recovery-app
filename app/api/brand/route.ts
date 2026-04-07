import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const Body = z.object({
  agentName: z.string().min(1),
  brokerage: z.string().optional(),
  marketCity: z.string().optional(),
  marketState: z.string().optional(),
  tone: z.string().default("professional"),
  sendWindowStartHour: z.number().int().min(0).max(23).optional(),
  sendWindowEndHour: z.number().int().min(1).max(24).optional(),
  timezone: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.brandProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
