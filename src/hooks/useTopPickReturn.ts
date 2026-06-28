import { useEffect, useState } from "react";
import { fetchTodayPicks } from "@/lib/marketApi";
import { marketGatewayFetch } from "@/lib/marketGateway";

export interface TopPickReturn {
  symbol: string;
  name: string;
  /** 21-trading-day trailing return as a fraction (0.082 = +8.2%), or null. */
  ret21d: number | null;
}

export type TopPickReturnState = {
  status: "loading" | "ready" | "error";
  data: TopPickReturn | null;
};

/**
 * Live, public (no-login) read of today's #1 pick and its 21-day trailing return.
 * Picks + returns are public market data. Degrades gracefully: returns `error`
 * on failure/empty so the UI can fall back instead of showing a fake number.
 *
 * Note: the returns API only computes horizons 1, 5, 21 trading days (see
 * API_GUIDE / domain gotcha #1) — 21d is the longest real trailing window.
 */
export function useTopPickReturn(): TopPickReturnState {
  const [state, setState] = useState<TopPickReturnState>({ status: "loading", data: null });

  useEffect(() => {
    const ctrl = new AbortController();

    (async () => {
      try {
        const picks = await fetchTodayPicks(1, ctrl.signal);
        const top = picks[0];
        if (!top) {
          if (!ctrl.signal.aborted) setState({ status: "error", data: null });
          return;
        }

        let ret21d: number | null = null;
        try {
          const res = await marketGatewayFetch(`/market/returns/${top.symbol}`, {
            searchParams: { horizons: "1,5,21" },
            signal: ctrl.signal,
          });
          if (res.ok) {
            const json = (await res.json()) as {
              data?: { returns?: Record<string, number | null> };
            };
            const r = json.data?.returns ?? {};
            ret21d = (r["21d"] ?? r["21"]) ?? null;
          }
        } catch {
          // Leave ret21d null — we still have the live pick symbol.
        }

        if (!ctrl.signal.aborted) {
          setState({ status: "ready", data: { symbol: top.symbol, name: top.name, ret21d } });
        }
      } catch {
        if (!ctrl.signal.aborted) setState({ status: "error", data: null });
      }
    })();

    return () => ctrl.abort();
  }, []);

  return state;
}
