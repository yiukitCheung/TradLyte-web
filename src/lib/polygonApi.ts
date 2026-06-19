import { polygonProxyFetch } from "@/lib/polygonGateway";
import { toSafeNumber, type PricePoint } from "@/lib/marketApi";
import { latestTradingDay, previousTradingDay } from "@/lib/marketHours";

/** Polygon aggregate bar: t=epoch ms, o/h/l/c/v. */
interface PolygonAgg {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface PolygonAggResponse {
  results?: PolygonAgg[];
  resultsCount?: number;
  status?: string;
}

async function fetchMinuteAggs(
  symbol: string,
  day: string,
  sort: "asc" | "desc",
  limit: number,
  signal?: AbortSignal,
): Promise<PolygonAgg[]> {
  const path = `/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/minute/${day}/${day}`;
  const res = await polygonProxyFetch(path, {
    searchParams: { adjusted: "true", sort, limit: String(limit) },
    signal,
  });
  if (!res.ok) {
    // Don't swallow silently — a non-2xx here (rate limit, upstream error) is
    // why the 1D chart can fall back to the prior session and look "stale".
    const body = await res.text().catch(() => "");
    console.error("[fetchMinuteAggs] non-2xx", { symbol, day, status: res.status, body: body.slice(0, 200) });
    return [];
  }
  const json = (await res.json()) as PolygonAggResponse;
  return Array.isArray(json.results) ? json.results : [];
}

/**
 * Today's (or the most recent session's) 1-minute bars as `PricePoint[]`,
 * delayed ~15 min on Polygon Starter. Falls back to the prior session when the
 * current day has no bars yet (pre-open / holiday / weekend).
 */
export async function fetchIntradaySeries(symbol: string, signal?: AbortSignal): Promise<PricePoint[]> {
  const day = latestTradingDay();
  let aggs = await fetchMinuteAggs(symbol, day, "asc", 1000, signal);
  if (aggs.length === 0) {
    aggs = await fetchMinuteAggs(symbol, previousTradingDay(day), "asc", 1000, signal);
  }
  return aggs
    .map((a) => ({ date: new Date(a.t).toISOString(), price: toSafeNumber(a.c) }))
    .filter((p): p is PricePoint => p.price !== null);
}

export interface DelayedPrice {
  price: number;
  /** ISO timestamp of the bar this price came from. */
  asOf: string;
}

/** Latest delayed price for one symbol (last minute bar of the current session). */
export async function fetchLatestPrice(symbol: string, signal?: AbortSignal): Promise<DelayedPrice | null> {
  const day = latestTradingDay();
  let aggs = await fetchMinuteAggs(symbol, day, "desc", 1, signal);
  if (aggs.length === 0) {
    aggs = await fetchMinuteAggs(symbol, previousTradingDay(day), "desc", 1, signal);
  }
  const a = aggs[0];
  const price = toSafeNumber(a?.c);
  if (!a || price === null) return null;
  return { price, asOf: new Date(a.t).toISOString() };
}

/** Latest delayed prices for several symbols (batched, capped fan-out). */
export async function fetchLatestPrices(
  symbols: string[],
  signal?: AbortSignal,
): Promise<Map<string, DelayedPrice>> {
  const map = new Map<string, DelayedPrice>();
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const batchSize = 8;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const dp = await fetchLatestPrice(symbol, signal);
          if (dp) map.set(symbol, dp);
        } catch {
          /* leave unset */
        }
      }),
    );
  }
  return map;
}
