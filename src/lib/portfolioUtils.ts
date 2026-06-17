import type { PricePoint } from "@/lib/marketApi";

export interface PortfolioCurvePoint {
  date: string;
  value: number;
}

/**
 * Build the user's portfolio value curve over time — reflecting what they
 * actually held, not what today's basket would have been worth historically.
 *
 * Each holding only contributes to the value from its `purchaseDate` (the day it
 * was added) forward; before that it counts as $0. Dates with no holding yet are
 * dropped, so the line starts at the first purchase — a stock added today yields
 * just a starting point, and the trend builds as days accrue. Each symbol's last
 * seen price is forward-filled so a missing bar doesn't zero the whole value.
 */
export function buildPortfolioCurve(
  seriesBySymbol: Record<string, PricePoint[]>,
  holdings: Array<{ symbol: string; qty: number; purchaseDate?: string | null }>,
): PortfolioCurvePoint[] {
  const priceMaps: Record<string, Map<string, number>> = {};
  const dateSet = new Set<string>();
  for (const [symbol, series] of Object.entries(seriesBySymbol)) {
    const m = new Map<string, number>();
    for (const p of series) {
      m.set(p.date, p.price);
      dateSet.add(p.date);
    }
    priceMaps[symbol] = m;
  }

  const dates = [...dateSet].sort();
  if (dates.length === 0) return [];

  // Compare by calendar day (YYYY-MM-DD); timestamps sort the same lexicographically.
  const dayOf = (iso: string) => iso.slice(0, 10);

  const lastPrice: Record<string, number> = {};
  const result: PortfolioCurvePoint[] = [];
  for (const date of dates) {
    const day = dayOf(date);
    let value = 0;
    let anyActive = false;
    for (const h of holdings) {
      const px = priceMaps[h.symbol]?.get(date);
      if (px != null) lastPrice[h.symbol] = px;
      // A holding only counts on/after the day it was added.
      const held = !h.purchaseDate || dayOf(h.purchaseDate) <= day;
      if (!held) continue;
      const use = lastPrice[h.symbol];
      if (use != null) {
        value += use * h.qty;
        anyActive = true;
      }
    }
    if (anyActive) result.push({ date, value });
  }
  return result;
}

/**
 * Pick the best and worst performer (by gain %) from a holdings list.
 * Returns `bottom: null` when there's only one holding (no meaningful contrast).
 */
export function splitWinnersLosers<T extends { gain: number }>(
  holdings: T[],
): { top: T | null; bottom: T | null } {
  if (holdings.length === 0) return { top: null, bottom: null };
  const sorted = [...holdings].sort((a, b) => b.gain - a.gain);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  return { top, bottom: sorted.length > 1 ? bottom : null };
}
