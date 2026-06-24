import { supabase } from "@/integrations/supabase/client";

/** Confirmed recommendation numbers from the serving table (all *_pct are fractions). */
export type StrategyRecommendation = {
  symbol: string;
  regime_bucket: string;
  skeleton_id: string;
  params: Record<string, number | string>;
  real_return_pct: number;
  real_win_rate: number;
  real_max_drawdown_pct: number;
  real_sharpe: number;
  real_trade_count: number;
  confirmation_window_days: number;
  as_of_date: string;
};

export type StrategyRead = {
  status: "confirmed" | "cold" | string;
  symbol: string;
  recommendation: StrategyRecommendation | null;
  narrative: string | null;
};

/** Fetch the strategy read for a symbol via the strategy-read Edge Function. */
export async function fetchStrategyRead(symbol: string): Promise<StrategyRead> {
  const { data, error } = await supabase.functions.invoke("strategy-read", {
    body: { symbol },
  });
  if (error) throw new Error(error.message || "Could not load the strategy read");
  return data as StrategyRead;
}

// ── Humanizing the strategy identity (no jargon on screen) ──────────────────

const SKELETON_HEADLINE: Record<string, string> = {
  trend: "Ride the trend",
  mean_reversion: "Buy the dip",
  breakout: "Catch the breakout",
};

const SKELETON_APPROACH: Record<string, string> = {
  trend: "Trend-following",
  mean_reversion: "Mean-reversion",
  breakout: "Breakout",
};

const REGIME_LABEL: Record<string, string> = {
  calm_bull: "a calm uptrend",
  volatile_bull: "a choppy uptrend",
  calm_bear: "a calm downtrend",
  panic_bear: "a volatile downtrend",
  warmup: "an unsettled market",
};

export function strategyHeadline(skeletonId: string): string {
  return SKELETON_HEADLINE[skeletonId] ?? "Best-fit strategy";
}

export function strategyApproach(skeletonId: string): string {
  return SKELETON_APPROACH[skeletonId] ?? skeletonId.replace(/_/g, " ");
}

export function regimeLabel(bucket: string): string {
  return REGIME_LABEL[bucket] ?? "current conditions";
}

/** A compact, plain-language subline describing the strategy's key knobs. */
export function strategyDetail(rec: StrategyRecommendation): string {
  const p = rec.params ?? {};
  const bits: string[] = [SKELETON_APPROACH[rec.skeleton_id] ?? rec.skeleton_id];
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v));
  if (p.rsi_period != null) bits.push(`RSI(${num(p.rsi_period)})`);
  if (p.rsi_oversold != null) bits.push(`oversold < ${Math.round(num(p.rsi_oversold))}`);
  if (p.take_pct != null) bits.push(`+${Math.round(num(p.take_pct) * 100)}% target`);
  if (p.stop_pct != null) bits.push(`${Math.round(num(p.stop_pct) * 100)}% stop`);
  if (typeof p.pattern === "string" && p.pattern) {
    bits.push(String(p.pattern).toLowerCase().replace(/_/g, " "));
  }
  return bits.join(" · ");
}

// ── Number formatting (serving numbers are fractions) ───────────────────────

export const pctSigned = (frac: number, digits = 1): string =>
  `${frac >= 0 ? "+" : ""}${(frac * 100).toFixed(digits)}%`;

export const pct = (frac: number, digits = 0): string => `${(frac * 100).toFixed(digits)}%`;

/** Drawdown is stored as a positive loss magnitude; show it as the loss it is. */
export const drawdownLabel = (frac: number, digits = 1): string => `−${(frac * 100).toFixed(digits)}%`;
