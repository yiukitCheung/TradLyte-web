import { isSameDay, parseISO } from "date-fns";

export const LOG_ROW_LABELS = [
  "Pre-market intent",
  "Today's lesson",
  "A small win",
] as const;

export type LogRowLabel = (typeof LOG_ROW_LABELS)[number];

export interface JournalEntryView {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  tags: string[] | null;
  created_at: string | null;
}

export interface TradeDecision {
  symbol: string;
  name: string;
  side: "Bought" | "Sold";
  change: string;
  up: boolean;
  reflected: boolean;
}

export interface DebriefQuestion {
  symbol: string;
  q: string;
  pending: boolean;
}

export function parseLogContent(content: string): Record<LogRowLabel, string> {
  const out: Record<LogRowLabel, string> = {
    "Pre-market intent": "",
    "Today's lesson": "",
    "A small win": "",
  };
  for (const label of LOG_ROW_LABELS) {
    const re = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.*)`, "i");
    const match = content.match(re);
    if (match?.[1] && match[1].trim() !== "—") out[label] = match[1].trim();
  }
  return out;
}

export function formatLogContent(log: Record<string, string>): string {
  return LOG_ROW_LABELS.map((label) => `${label}: ${log[label]?.trim() || "—"}`).join("\n");
}

export function entryMentionsSymbol(entry: JournalEntryView, symbol: string): boolean {
  const sym = symbol.toUpperCase();
  if (entry.tags?.some((t) => t.toUpperCase() === sym)) return true;
  return entry.content.toUpperCase().includes(sym);
}

export function mapPortfolioToDecisions(
  holdings: Array<{
    asset_name: string;
    purchase_price: number | null;
    current_price: number | null;
    created_at: string | null;
    updated_at: string | null;
  }>,
  entriesToday: JournalEntryView[],
): TradeDecision[] {
  const today = new Date();
  return holdings
    .filter((h) => {
      const ts = h.updated_at || h.created_at;
      if (!ts) return false;
      return isSameDay(parseISO(ts), today);
    })
    .slice(0, 4)
    .map((h) => {
      const purchase = h.purchase_price ?? 0;
      const current = h.current_price ?? purchase;
      const pct = purchase > 0 ? ((current - purchase) / purchase) * 100 : 0;
      const symbol = h.asset_name.toUpperCase();
      const reflected = entriesToday.some((e) => entryMentionsSymbol(e, symbol));
      return {
        symbol,
        name: symbol,
        side: "Bought" as const,
        change: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
        up: pct >= 0,
        reflected,
      };
    });
}

export function buildDebriefQuestions(decisions: TradeDecision[]): DebriefQuestion[] {
  return decisions.map((d) => ({
    symbol: d.symbol,
    q: d.reflected
      ? `You already reflected on ${d.symbol} — anything you'd add looking back?`
      : d.side === "Bought"
        ? `What told you ${d.symbol} was the right buy today — conviction or momentum?`
        : `Closing ${d.symbol} — was that your plan, or the moment?`,
    pending: !d.reflected,
  }));
}

export function averageMood(entries: JournalEntryView[]): string | null {
  const moods = entries.map((e) => e.mood).filter(Boolean) as string[];
  if (moods.length === 0) return null;
  const counts = moods.reduce<Record<string, number>>((acc, mood) => {
    acc[mood] = (acc[mood] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function findTodayEntry(entries: JournalEntryView[]): JournalEntryView | null {
  const today = new Date();
  return entries.find((e) => e.created_at && isSameDay(parseISO(e.created_at), today)) ?? null;
}
