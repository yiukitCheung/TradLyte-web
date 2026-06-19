import { useEffect, useRef, useState } from "react";
import { isUsMarketLikelyOpen, latestTradingDay, etDateString } from "@/lib/marketHours";
import { fetchIntradaySeries, fetchLatestPrices, type DelayedPrice } from "@/lib/polygonApi";
import type { PricePoint } from "@/lib/marketApi";

const POLL_MS = 30_000;

/**
 * Run `run` once immediately (to load the last session), then re-run every
 * POLL_MS — but only while the tab is visible and the US market is in session.
 * Each run gets a fresh AbortSignal; the previous in-flight request is aborted.
 */
function usePoll(run: (signal: AbortSignal) => Promise<void>, active: boolean, depKey: string) {
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    if (!active) return;
    let controller: AbortController | null = null;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      controller = new AbortController();
      void runRef.current(controller.signal);
    };

    tick(); // immediate — loads the latest session even when the market is closed
    const id = setInterval(() => {
      if (isUsMarketLikelyOpen()) tick();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, depKey]);
}

/** Today's intraday minute series (delayed) + the latest delayed price, polled. */
export function useIntradaySeries(symbol: string | undefined, active: boolean) {
  const [series, setSeries] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Clear immediately on symbol change so we never show another ticker's line
  // (or a previous session's) while the new fetch is in flight.
  useEffect(() => {
    setSeries([]);
  }, [symbol]);

  usePoll(
    async (signal) => {
      if (!symbol) return;
      setLoading(true);
      try {
        const s = await fetchIntradaySeries(symbol, signal);
        if (!signal.aborted) setSeries(s);
      } catch (e) {
        if (!(e instanceof Error && e.name === "AbortError")) console.error("Intraday fetch failed:", e);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    active && !!symbol,
    symbol ?? "",
  );

  const tail = series[series.length - 1];
  const latest: DelayedPrice | null = tail ? { price: tail.price, asOf: tail.date } : null;
  // ET calendar date of the data we're actually showing, and whether that's the
  // current trading day (live, delayed) vs. a fallback to the prior session.
  const asOfDay = tail ? etDateString(new Date(tail.date)) : null;
  const isLive = !!asOfDay && asOfDay === latestTradingDay();
  return { series, latest, loading, asOfDay, isLive };
}

/** Latest delayed price per symbol, polled. */
export function useDelayedPrices(symbols: string[], active: boolean) {
  const [prices, setPrices] = useState<Map<string, DelayedPrice>>(new Map());
  const depKey = [...new Set(symbols.map((s) => s.toUpperCase()))].sort().join(",");

  usePoll(
    async (signal) => {
      const m = await fetchLatestPrices(symbols, signal);
      if (!signal.aborted && m.size > 0) setPrices(m);
    },
    active && symbols.length > 0,
    depKey,
  );

  return prices;
}
