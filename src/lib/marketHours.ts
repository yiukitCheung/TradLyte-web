/**
 * US-market-hours helpers (Eastern time), used to gate polling so we don't
 * hammer the API overnight/on weekends. Approximate: regular session only
 * (9:30–16:00 ET, Mon–Fri); does NOT account for market holidays — on a
 * holiday the data fetch simply returns the prior session.
 */

function etParts(d: Date): { weekday: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // Intl can emit "24" for midnight in some runtimes — normalize to 0.
  const hour = Number(get("hour")) % 24;
  return { weekday: get("weekday"), hour, minute: Number(get("minute")) };
}

function isWeekend(weekday: string): boolean {
  return weekday === "Sat" || weekday === "Sun";
}

/** Eastern calendar date as YYYY-MM-DD. */
function etDateString(d: Date): string {
  // en-CA renders ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

/** True during the regular US session (9:30–16:00 ET, weekdays). */
export function isUsMarketLikelyOpen(d: Date = new Date()): boolean {
  const { weekday, hour, minute } = etParts(d);
  if (isWeekend(weekday)) return false;
  const mins = hour * 60 + minute;
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

/** Most recent weekday (in ET) on/before `d`. Holidays are not modeled. */
export function latestTradingDay(d: Date = new Date()): string {
  let cur = d;
  for (let i = 0; i < 6; i++) {
    if (!isWeekend(etParts(cur).weekday)) return etDateString(cur);
    cur = new Date(cur.getTime() - 86_400_000);
  }
  return etDateString(cur);
}

/** The trading day immediately before `dayIso` (YYYY-MM-DD). */
export function previousTradingDay(dayIso: string): string {
  const prev = new Date(`${dayIso}T12:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return latestTradingDay(prev);
}
