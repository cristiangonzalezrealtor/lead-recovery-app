// 18 prebuilt sequence templates: 3 variants × 6 lead types.
//
// Each step uses handlebars-style merge tokens that the render pipeline
// will replace: {{firstName}}, {{agentName}}, {{marketCity}}, {{brokerage}}.
// The `aiInstructions` field is injected into the AI personalization
// layer at render time — the LLM may rewrite subject/body to better fit
// the lead, but must preserve any required tokens.

import type { LeadType } from "@prisma/client";

export const NEW_LEAD_DAYS = [0, 2, 4, 7, 10, 14, 21];
export const DORMANT_DAYS = [0, 1, 3, 6, 10, 15, 21];

export interface StepTemplate {
  subject: string;
  body: string;
  aiInstructions: string;
}

export interface SequenceTemplate {
  name: string;
  leadType: LeadType;
  tone: string;
  ctaGoal: string;
  cadence: number[];
  steps: StepTemplate[];
}

const signatureTail = "\n\n— {{agentName}}{{#brokerage}}, {{brokerage}}{{/brokerage}}";

// ── Helpers ──────────────────────────────────────────────────────────
const genericAI =
  "Rewrite to sound natural and conversational. Keep it under 120 words. Preserve all merge tokens. Do not fabricate property or market details.";

function sellerSequence(
  name: string,
  tone: string,
  ctaGoal: string,
  lines: string[][]
): SequenceTemplate {
  return {
    name,
    leadType: "seller",
    tone,
    ctaGoal,
    cadence: NEW_LEAD_DAYS,
    steps: lines.map((lns, i) => ({
      subject: lns[0],
      body: lns.slice(1).join("\n\n") + signatureTail,
      aiInstructions: genericAI,
    })),
  };
}

function buildSequence(
  leadType: LeadType,
  name: string,
  tone: string,
  ctaGoal: string,
  cadence: number[],
  lines: string[][]
): SequenceTemplate {
  return {
    name,
    leadType,
    tone,
    ctaGoal,
    cadence,
    steps: lines.map((lns) => ({
      subject: lns[0],
      body: lns.slice(1).join("\n\n") + signatureTail,
      aiInstructions: genericAI,
    })),
  };
}

// ── SELLER (3) ────────────────────────────────────────────────────────
const sellerStraight = sellerSequence(
  "Seller — Direct Value",
  "professional",
  "book_valuation_call",
  [
    ["Quick question about your {{marketCity}} home", "Hi {{firstName}},", "I saw you were looking into what your home might be worth. Happy to pull a no-pressure valuation for your block — would a 10-minute call this week work?"],
    ["Your neighborhood just moved", "Hi {{firstName}},", "Two homes within a mile of yours just sold above asking. Want me to send a short comp report for your address?"],
    ["Timing matters right now", "Hi {{firstName}},", "Inventory is tight in {{marketCity}}. If you're even 3–6 months out from listing, now is when prep work pays off. Worth a quick conversation?"],
    ["Three things I'd tell any seller today", "Hi {{firstName}},", "1. Price correctly from day one.\n2. Fix the ten cheapest things first.\n3. Photos are 80% of the first click.\n\nI can walk through what applies to your home in 15 minutes."],
    ["No pitch — just a question", "Hi {{firstName}},", "Is selling still on your radar, or did plans change? Totally fine either way, just want to stop nudging if it's not a fit."],
    ["One last resource", "Hi {{firstName}},", "Sending along the free seller prep checklist we use with clients. No opt-in, no strings."],
    ["Closing the loop", "Hi {{firstName}},", "I'll stop emailing after this one. If selling comes back on your radar, you know where to find me."],
  ]
);

const sellerCurious = sellerSequence(
  "Seller — Curiosity Angle",
  "friendly",
  "book_valuation_call",
  [
    ["Something surprising about your street", "Hi {{firstName}},", "Quick story — a home nearby just sold for a number I didn't expect. Want the details? Takes 2 minutes."],
    ["Would you buy your own house today?", "Hi {{firstName}},", "Odd question, but it's a great exercise for thinking about listing. Happy to talk through it."],
    ["The one room that sells the house", "Hi {{firstName}},", "Hint: it's not the kitchen. I can send a 1-page guide if you're curious."],
    ["What most sellers wish they knew earlier", "Hi {{firstName}},", "Three things that cost nothing but change buyer behavior. Want me to send the list?"],
    ["Your timing matters more than your price", "Hi {{firstName}},", "Happy to do a 10-minute walkthrough of the seasonal dynamics in {{marketCity}}."],
    ["Still thinking about it?", "Hi {{firstName}},", "Totally fine if the timing isn't right. Just want to make sure you have what you need when it is."],
    ["Last note", "Hi {{firstName}},", "Reach out any time. I'll go quiet after this."],
  ]
);

const sellerUrgency = sellerSequence(
  "Seller — Market Urgency",
  "direct",
  "book_valuation_call",
  [
    ["Interest rates and your listing window", "Hi {{firstName}},", "Rates are moving. If you're considering selling in the next 6 months, timing matters more than usual. 15-minute call?"],
    ["Inventory update for {{marketCity}}", "Hi {{firstName}},", "Active listings are at their lowest level in two years. That's a tailwind for sellers. Want the numbers for your zip?"],
    ["What 'above asking' actually means", "Hi {{firstName}},", "It's not luck — it's pricing strategy. I can walk through the playbook."],
    ["Three signals the market just shifted", "Hi {{firstName}},", "Days on market, price-per-sqft, and offer counts all moved last month. Happy to explain what that means for your home."],
    ["If not now, when?", "Hi {{firstName}},", "Not pushing — just asking. What would need to be true for you to list?"],
    ["Free resource", "Hi {{firstName}},", "Sending the pre-listing checklist we use internally. No strings."],
    ["Signing off", "Hi {{firstName}},", "Stopping here. Happy to help whenever the timing's right."],
  ]
);

// ── BUYER (3) ─────────────────────────────────────────────────────────
const buyerSimple = buildSequence(
  "buyer",
  "Buyer — Simple Welcome",
  "friendly",
  "book_buyer_consultation",
  NEW_LEAD_DAYS,
  [
    ["Welcome — what are you looking for?", "Hi {{firstName}},", "Thanks for reaching out. Quickest way I can help: tell me your top 3 must-haves and rough budget."],
    ["New listings in your range", "Hi {{firstName}},", "I can set up a curated list delivered the moment anything matching your criteria hits the market. Want me to turn it on?"],
    ["A few questions most buyers skip", "Hi {{firstName}},", "Pre-approved yet? Flexible on location? First-time or second home? These drive everything."],
    ["How showings actually work here", "Hi {{firstName}},", "Short primer on how I line up showings in {{marketCity}} so you don't waste weekends."],
    ["What I look for that buyers miss", "Hi {{firstName}},", "Foundation, drainage, roof age. Price is the last thing to worry about. Want my inspection checklist?"],
    ["Ready whenever you are", "Hi {{firstName}},", "Let me know what's next — I'll follow your lead."],
    ["Last note", "Hi {{firstName}},", "Closing out the intro sequence. Reach out whenever."],
  ]
);

const buyerFirstTime = buildSequence(
  "buyer",
  "Buyer — First-Time Buyer",
  "warm",
  "book_buyer_consultation",
  NEW_LEAD_DAYS,
  [
    ["First-time buyer? You're in the right place", "Hi {{firstName}},", "First-time buying is a lot. I'll walk you through it at whatever pace you want."],
    ["The 5 biggest first-time buyer mistakes", "Hi {{firstName}},", "Want me to send a 1-page list? No opt-in."],
    ["Down payment reality check", "Hi {{firstName}},", "20% is a myth. Let's talk about what actually makes sense for your situation."],
    ["Pre-approval vs pre-qualification", "Hi {{firstName}},", "These are very different. 5 minutes on the phone and you'll know which you need."],
    ["What inspectors always find", "Hi {{firstName}},", "And what's actually a dealbreaker. Free checklist available."],
    ["Checking in", "Hi {{firstName}},", "How's the search going? I can help even if you're months away."],
    ["Always here", "Hi {{firstName}},", "Email any time. I'll stop the automated messages here."],
  ]
);

const buyerInvestor = buildSequence(
  "buyer",
  "Buyer — Investor Crossover",
  "direct",
  "book_investor_consultation",
  NEW_LEAD_DAYS,
  [
    ["Live-in or rental? I can help with both", "Hi {{firstName}},", "If you're blurring the line between primary and investment, I want to make sure we're looking at the right deals."],
    ["Cap rates in {{marketCity}}", "Hi {{firstName}},", "I track returns by neighborhood. Want the current snapshot?"],
    ["Off-market vs MLS", "Hi {{firstName}},", "Both have a place. Happy to explain when to chase each."],
    ["House hacking playbook", "Hi {{firstName}},", "Short guide to duplex and ADU strategies in our market."],
    ["Numbers first, home second", "Hi {{firstName}},", "Walking through a sample deal in 15 minutes can save you months."],
    ["Still interested?", "Hi {{firstName}},", "Let me know if the focus shifted — I'll adjust."],
    ["Closing out", "Hi {{firstName}},", "Stopping the sequence. Reach out whenever."],
  ]
);

// ── INVESTOR (3) ──────────────────────────────────────────────────────
const investorDeal = buildSequence(
  "investor",
  "Investor — Deal Pipeline",
  "direct",
  "book_deal_review",
  NEW_LEAD_DAYS,
  [
    ["Are you on my deal list?", "Hi {{firstName}},", "I send off-market opportunities in {{marketCity}} to a short list. Want in?"],
    ["Current cap rate snapshot", "Hi {{firstName}},", "Sharing the numbers I track weekly. Free — just reply 'yes'."],
    ["Three deals I passed on last month (and why)", "Hi {{firstName}},", "Useful even if you're not buying — shows what I filter for."],
    ["What's your buy box?", "Hi {{firstName}},", "Tell me size, return target, and neighborhoods and I'll line things up."],
    ["Money is the easy part", "Hi {{firstName}},", "Happy to intro you to lenders doing creative deals right now."],
    ["Checking in", "Hi {{firstName}},", "Still active? I'll keep you on the list if so."],
    ["Closing the loop", "Hi {{firstName}},", "Reach out any time. Stopping automated emails here."],
  ]
);

const investorAnalytics = buildSequence(
  "investor",
  "Investor — Data-Driven",
  "professional",
  "book_deal_review",
  NEW_LEAD_DAYS,
  [
    ["The only 3 numbers that matter", "Hi {{firstName}},", "Cash-on-cash, DSCR, effective rent. Everything else is noise."],
    ["{{marketCity}} YoY rent growth", "Hi {{firstName}},", "Happy to share the data I pull monthly."],
    ["Portfolio review offer", "Hi {{firstName}},", "If you own rentals already I can stress-test your numbers. Free 20-minute call."],
    ["Deal flow preferences", "Hi {{firstName}},", "SFR, multifamily, or mixed-use — which are you chasing?"],
    ["Sharing a sample pro-forma", "Hi {{firstName}},", "Clean template with real comps. Want it?"],
    ["Checking in", "Hi {{firstName}},", "Still in the market?"],
    ["Closing out", "Hi {{firstName}},", "Stopping here. Reply any time."],
  ]
);

const investorRelationship = buildSequence(
  "investor",
  "Investor — Long-Term Relationship",
  "warm",
  "book_deal_review",
  NEW_LEAD_DAYS,
  [
    ["Not trying to sell you a deal today", "Hi {{firstName}},", "Investors worth knowing don't need to be sold. I'd rather build a relationship first."],
    ["My market thesis", "Hi {{firstName}},", "Happy to share what I'm bullish and bearish on right now."],
    ["Coffee in {{marketCity}}?", "Hi {{firstName}},", "Zero-pressure meetup. I buy."],
    ["Free resource", "Hi {{firstName}},", "My deal filter checklist, no opt-in."],
    ["Network introductions", "Hi {{firstName}},", "I know contractors, lenders, and property managers worth knowing. Happy to connect you."],
    ["Still interested?", "Hi {{firstName}},", "Let me know if the focus shifted."],
    ["Signing off", "Hi {{firstName}},", "Stopping emails here. Reach out any time."],
  ]
);

// ── RENTAL (3) ────────────────────────────────────────────────────────
const rentalSimple = buildSequence(
  "rental",
  "Rental — Quick Match",
  "friendly",
  "book_showing",
  NEW_LEAD_DAYS,
  [
    ["Looking for a rental in {{marketCity}}?", "Hi {{firstName}},", "Tell me budget, bedrooms, and move-in date and I'll shortlist immediately."],
    ["New listings matching your budget", "Hi {{firstName}},", "I can set up automatic alerts. Want me to turn them on?"],
    ["Tips for getting approved", "Hi {{firstName}},", "Tighter market than usual — happy to share the application playbook."],
    ["Pet-friendly options", "Hi {{firstName}},", "If pets are a factor, I filter for real pet-friendly vs. 'case by case'."],
    ["Still searching?", "Hi {{firstName}},", "Let me know how it's going — I can send fresh listings any time."],
    ["Quick resource", "Hi {{firstName}},", "Lease clause watchlist — a few things worth double-checking."],
    ["Closing the loop", "Hi {{firstName}},", "Stopping here. Reach out when you need anything."],
  ]
);

const rentalRelocation = buildSequence(
  "rental",
  "Rental — Relocation",
  "professional",
  "book_showing",
  NEW_LEAD_DAYS,
  [
    ["Moving to {{marketCity}}?", "Hi {{firstName}},", "Relocation is a lot. I can help you avoid the most common traps."],
    ["Neighborhood primer", "Hi {{firstName}},", "Quick breakdown of commute, schools, and noise by zip."],
    ["Virtual tours available", "Hi {{firstName}},", "Can't visit yet? I'll record walk-throughs."],
    ["Lease timing matters", "Hi {{firstName}},", "Signing 60+ days out vs. 30 out changes what's available. Worth discussing."],
    ["What to ship vs. buy local", "Hi {{firstName}},", "Boring but useful — saved a recent client $4k."],
    ["Still planning the move?", "Hi {{firstName}},", "Let me know if plans shifted."],
    ["Closing out", "Hi {{firstName}},", "Reach out any time — good luck with the move."],
  ]
);

const rentalLuxury = buildSequence(
  "rental",
  "Rental — Luxury",
  "warm",
  "book_showing",
  NEW_LEAD_DAYS,
  [
    ["Luxury rentals in {{marketCity}}", "Hi {{firstName}},", "Most of the best listings never hit the public portals. I can show you the quiet inventory."],
    ["This month's off-market options", "Hi {{firstName}},", "Short list — happy to send it."],
    ["Furnished vs unfurnished", "Hi {{firstName}},", "Both have trade-offs. I can walk through them."],
    ["White-glove showings", "Hi {{firstName}},", "I coordinate with building management so you see everything worth seeing in one afternoon."],
    ["Concierge services", "Hi {{firstName}},", "Moving, design, cleaning — I have trusted contacts for all of it."],
    ["Still interested?", "Hi {{firstName}},", "Let me know what's next."],
    ["Signing off", "Hi {{firstName}},", "Reach out any time."],
  ]
);

// ── VALUATION (3) ─────────────────────────────────────────────────────
const valuationFast = buildSequence(
  "valuation",
  "Valuation — Fast Turnaround",
  "professional",
  "book_valuation_call",
  NEW_LEAD_DAYS,
  [
    ["Your home value request", "Hi {{firstName}},", "Automated estimates are usually off by 5–15%. A human review takes me 20 minutes and is much more accurate."],
    ["Comps for your block", "Hi {{firstName}},", "I can pull the real comps, not just Zillow's guess. Want them?"],
    ["What's missing from online estimates", "Hi {{firstName}},", "Condition, view, and micro-location — all ignored by automated tools."],
    ["What's your timeline?", "Hi {{firstName}},", "Your number depends heavily on when you're thinking of selling. 2 minutes?"],
    ["No pressure", "Hi {{firstName}},", "Valuation doesn't obligate anything. Happy to help either way."],
    ["Free checklist", "Hi {{firstName}},", "If you are considering selling, here's the pre-list prep we use."],
    ["Closing the loop", "Hi {{firstName}},", "Stopping here. Reach out any time."],
  ]
);

const valuationTrust = buildSequence(
  "valuation",
  "Valuation — Trust Building",
  "warm",
  "book_valuation_call",
  NEW_LEAD_DAYS,
  [
    ["About me before I send numbers", "Hi {{firstName}},", "Short intro so you know who's pulling your valuation."],
    ["How I pull comps", "Hi {{firstName}},", "Not magic — just a real process. Happy to walk you through it."],
    ["Three recent sales I worked on", "Hi {{firstName}},", "Short stories with the actual numbers."],
    ["The hardest part of pricing", "Hi {{firstName}},", "Knowing what to exclude. I'll share the list."],
    ["Your turn", "Hi {{firstName}},", "Ready for your valuation whenever you are."],
    ["Resource", "Hi {{firstName}},", "Pre-list checklist, no opt-in."],
    ["Closing out", "Hi {{firstName}},", "Stopping here."],
  ]
);

const valuationNurture = buildSequence(
  "valuation",
  "Valuation — Long-Term Nurture",
  "friendly",
  "book_valuation_call",
  NEW_LEAD_DAYS,
  [
    ["No rush on your valuation", "Hi {{firstName}},", "Plenty of people want a number without being ready to sell. That's fine — I can still help."],
    ["Monthly market note", "Hi {{firstName}},", "Want me to add you to the low-volume market update for your zip?"],
    ["Seasonal timing", "Hi {{firstName}},", "Spring vs. fall can mean 3–5% difference. Worth thinking through."],
    ["If you just want data", "Hi {{firstName}},", "I can send a clean comp report you can file away."],
    ["Checking in", "Hi {{firstName}},", "Anything change on your side?"],
    ["Free resource", "Hi {{firstName}},", "My pre-listing checklist — no opt-in."],
    ["Signing off", "Hi {{firstName}},", "Stopping here. Reach out whenever."],
  ]
);

// ── DORMANT (3) — curiosity-driven, value-based, never pushy ─────────
const dormantCurious = buildSequence(
  "dormant",
  "Dormant — Curiosity Revival",
  "warm",
  "reopen_conversation",
  DORMANT_DAYS,
  [
    ["Still thinking about {{marketCity}}?", "Hi {{firstName}},", "It's been a while. Not selling anything — just wondering where things landed."],
    ["Something changed in the market", "Hi {{firstName}},", "Last time we spoke the dynamics were different. Want a 2-minute update?"],
    ["No pitch, just a question", "Hi {{firstName}},", "Did you end up moving forward, or did plans change? Either answer is useful."],
    ["A resource you might actually use", "Hi {{firstName}},", "The pre-listing checklist we use internally. Free, no opt-in."],
    ["One story", "Hi {{firstName}},", "A client I worked with last year was in a similar spot. Want me to share how it played out?"],
    ["Still here if you need anything", "Hi {{firstName}},", "Not going to keep nudging — just wanted you to know."],
    ["Last note", "Hi {{firstName}},", "Stopping the sequence. Reach out whenever."],
  ]
);

const dormantValue = buildSequence(
  "dormant",
  "Dormant — Pure Value",
  "professional",
  "reopen_conversation",
  DORMANT_DAYS,
  [
    ["A quick update for your zip", "Hi {{firstName}},", "Sharing the latest numbers — no strings attached."],
    ["3 things that changed since we talked", "Hi {{firstName}},", "Rates, inventory, and days-on-market. Want the short version?"],
    ["Free comp report offer", "Hi {{firstName}},", "If you're curious what your home is worth today, I'll pull it for free."],
    ["Checklist I wish I'd had earlier", "Hi {{firstName}},", "Pre-listing prep in one page. Reply 'yes' and I'll send it."],
    ["Still here", "Hi {{firstName}},", "No rush. Whenever the timing's right."],
    ["One more resource", "Hi {{firstName}},", "Seller timing guide — seasonal patterns in {{marketCity}}."],
    ["Signing off", "Hi {{firstName}},", "Stopping here. Reach out any time."],
  ]
);

const dormantStory = buildSequence(
  "dormant",
  "Dormant — Story-Led",
  "friendly",
  "reopen_conversation",
  DORMANT_DAYS,
  [
    ["A client who was exactly where you are", "Hi {{firstName}},", "Ran into a past client this week whose situation reminded me of yours. Want me to share how it played out?"],
    ["What surprised them most", "Hi {{firstName}},", "Short version — the market moved faster than expected. Happy to tell the long version."],
    ["Would that path work for you?", "Hi {{firstName}},", "Not every story applies, but it might save you research."],
    ["No pressure, just curious", "Hi {{firstName}},", "Where did you land on the move idea?"],
    ["Free resource", "Hi {{firstName}},", "The pre-listing checklist, no opt-in."],
    ["Checking in", "Hi {{firstName}},", "Anything change I should know about?"],
    ["Closing out", "Hi {{firstName}},", "Stopping the sequence. Reach out whenever."],
  ]
);

export const TEMPLATES: SequenceTemplate[] = [
  sellerStraight, sellerCurious, sellerUrgency,
  buyerSimple, buyerFirstTime, buyerInvestor,
  investorDeal, investorAnalytics, investorRelationship,
  rentalSimple, rentalRelocation, rentalLuxury,
  valuationFast, valuationTrust, valuationNurture,
  dormantCurious, dormantValue, dormantStory,
];
