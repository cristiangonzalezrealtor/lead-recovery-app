// POST /api/leads/dormant-scan
//
// Two modes:
//   • Cron-authenticated (TICK_SECRET header) → scans every user's leads
//   • User-authenticated → scans just the current user's leads

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scanDormant } from "@/lib/core/revival/scan";

export async function POST(req: Request) {
  const tickSecret = process.env.TICK_SECRET;
  const providedSecret = req.headers.get("x-tick-secret");

  if (tickSecret && providedSecret === tickSecret) {
    // Cron path — scan everyone
    const users = await prisma.user.findMany({ select: { id: true } });
    const results: Record<string, unknown> = {};
    for (const u of users) {
      results[u.id] = await scanDormant(u.id);
    }
    return NextResponse.json({ mode: "cron", results });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await scanDormant(user.id);
  return NextResponse.json({ mode: "user", ...result });
}
