// POST /api/leads/rescore-all
//
// Re-runs the scoring engine across every lead the signed-in user owns,
// AND re-extracts signal tags from intentSignal so existing imports get
// the benefit of new tag rules without having to re-import the CSV.
//
// Used after the scoring engine is improved — lets the user redistribute
// hot/warm/nurture/low bands across already-imported leads.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rescoreLead } from "@/lib/core/scoring/persist";
import { enrichLead } from "@/lib/core/enrich";

function extractTagsFromSignal(signal: string | null | undefined): string[] {
  if (!signal) return [];
  const s = signal.toLowerCase();
  const tags: string[] = [];
  if (/\bexpired\b|withdrawn|cancell?ed/.test(s)) tags.push("expired_listing");
  if (/price reduc|reduced|new price|lowered/.test(s)) tags.push("price_reduced");
  if (/vacant|empty|unoccupied/.test(s)) tags.push("vacant");
  if (/absentee|out of state/.test(s)) tags.push("absentee_owner");
  if (/cash buyer|all cash/.test(s)) tags.push("cash_buyer");
  if (/relocat/.test(s)) tags.push("relocation");
  if (/luxury|estate|waterfront/.test(s)) tags.push("luxury");
  if (/motivated|must sell|need to sell/.test(s)) tags.push("motivated");
  return tags;
}

function isExpiredSource(source: string | null | undefined): boolean {
  if (!source) return false;
  return /vortex|expired|withdrawn|redx|landvoice/i.test(source);
}

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      tags: true,
      intentSignal: true,
      source: true,
      leadType: true,
    },
  });

  let updated = 0;
  let promotedToSeller = 0;

  for (const lead of leads) {
    const signalTags = extractTagsFromSignal(lead.intentSignal);
    const sourceTags = isExpiredSource(lead.source) ? ["expired_listing"] : [];
    const merged = Array.from(
      new Set([...(lead.tags ?? []), ...signalTags, ...sourceTags])
    );

    // Promote misclassified Vortex/expired leads from "buyer" → "seller".
    let nextType = lead.leadType;
    if (
      lead.leadType === "buyer" &&
      (merged.includes("expired_listing") || isExpiredSource(lead.source))
    ) {
      nextType = "seller";
      promotedToSeller++;
    }

    const tagsChanged =
      merged.length !== (lead.tags?.length ?? 0) ||
      merged.some((t) => !lead.tags?.includes(t));

    if (tagsChanged || nextType !== lead.leadType) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { tags: merged, leadType: nextType },
      });
    }

    await rescoreLead(lead.id);
    // Re-run revival / next-action / confidence so dormant status and
    // probability pick up the new tags + source rules.
    await enrichLead(lead.id);
    updated++;
  }

  // Count the new dormant pool to show the user something satisfying.
  const newlyDormant = await prisma.lead.count({
    where: { userId: user.id, isDormant: true },
  });

  return NextResponse.json({
    ok: true,
    rescored: updated,
    promotedToSeller,
    dormantCount: newlyDormant,
  });
}
