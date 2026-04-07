// POST /api/sequences/tick — cron-triggered sequence executor.
//
// Auth: TICK_SECRET header. Hit this every 5–15 minutes from a cron service.

import { NextResponse } from "next/server";
import { tickSequences } from "@/lib/core/sequence/tick";

export async function POST(req: Request) {
  const secret = process.env.TICK_SECRET;
  if (secret) {
    const provided = req.headers.get("x-tick-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await tickSequences();
  return NextResponse.json(result);
}
