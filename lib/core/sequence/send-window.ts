// Send-window enforcement.
//
// Given a target time and a user's window config, returns the next legal
// send instant that falls inside { startHour, endHour } in the user's
// timezone. If `when` is already inside the window, it's returned as-is.
//
// Uses the Intl API only — no external tz library. DST edges land within
// one hour of where they should be, which is acceptable for V1.

export interface WindowConfig {
  startHour: number; // 0–23
  endHour: number; // 0–23, exclusive
  timezone: string; // IANA, e.g. "America/Los_Angeles"
}

interface Parts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partsInTZ(date: Date, timezone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  // en-US `hour` with hour12:false can emit "24" at midnight — normalize.
  let hour = parseInt(map.hour ?? "0", 10);
  if (hour === 24) hour = 0;
  return {
    year: parseInt(map.year ?? "1970", 10),
    month: parseInt(map.month ?? "1", 10),
    day: parseInt(map.day ?? "1", 10),
    hour,
    minute: parseInt(map.minute ?? "0", 10),
    second: parseInt(map.second ?? "0", 10),
  };
}

// Returns the UTC instant that represents the given wall-clock time in
// the target timezone. Solved by iterating once (tz offset stable within
// the same day unless DST flips mid-jump, which we don't care about).
function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string
): Date {
  // Naive UTC guess
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  const guessParts = partsInTZ(guess, timezone);
  const desiredMs = Date.UTC(year, month - 1, day, hour, 0, 0);
  const actualMs = Date.UTC(
    guessParts.year,
    guessParts.month - 1,
    guessParts.day,
    guessParts.hour,
    guessParts.minute,
    guessParts.second
  );
  const diff = desiredMs - actualMs;
  return new Date(guess.getTime() + diff);
}

export function normalizeToSendWindow(
  when: Date,
  cfg: WindowConfig
): Date {
  const startHour = Math.max(0, Math.min(23, cfg.startHour ?? 9));
  const endHour = Math.max(startHour + 1, Math.min(24, cfg.endHour ?? 17));

  const local = partsInTZ(when, cfg.timezone);

  // Already inside → return as-is.
  if (local.hour >= startHour && local.hour < endHour) return when;

  // Before window today → push to startHour today.
  if (local.hour < startHour) {
    return zonedToUtc(local.year, local.month, local.day, startHour, cfg.timezone);
  }

  // After window → push to startHour tomorrow.
  const tomorrow = new Date(
    Date.UTC(local.year, local.month - 1, local.day) + 24 * 3600 * 1000
  );
  const t = partsInTZ(tomorrow, cfg.timezone);
  return zonedToUtc(t.year, t.month, t.day, startHour, cfg.timezone);
}

export function isInSendWindow(when: Date, cfg: WindowConfig): boolean {
  const local = partsInTZ(when, cfg.timezone);
  return local.hour >= cfg.startHour && local.hour < cfg.endHour;
}
