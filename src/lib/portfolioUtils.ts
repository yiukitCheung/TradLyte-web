import type { PricePoint } from "@/lib/marketApi";

export interface PortfolioCurvePoint {
  date: string;
  value: number;
}

/**
 * Build a portfolio market-value curve over time from per-symbol price series.
 *
 * Each symbol is valued at the user's *current* quantity across the whole window,
 * so the curve answers "what would this basket have been worth" — an honest
 * representation when only current holdings (not transaction history) are known.
 * Each symbol's last seen price is forward-filled across the unified date axis so
 * a missing bar for one symbol doesn't drop the whole portfolio's value to zero.
 */
export function buildPortfolioCurve(
  seriesBySymbol: Record<string, PricePoint[]>,
  holdings: Array<{ symbol: string; qty: number }>,
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

  const lastPrice: Record<string, number> = {};
  const result: PortfolioCurvePoint[] = [];
  for (const date of dates) {
    let value = 0;
    let anyPriced = false;
    for (const h of holdings) {
      const px = priceMaps[h.symbol]?.get(date);
      if (px != null) lastPrice[h.symbol] = px;
      const use = lastPrice[h.symbol];
      if (use != null) {
        value += use * h.qty;
        anyPriced = true;
      }
    }
    if (anyPriced) result.push({ date, value });
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
