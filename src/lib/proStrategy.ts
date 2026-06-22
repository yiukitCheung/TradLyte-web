/**
 * Pro Strategy Lab model. Framework-free so it stays node-testable.
 * Compiles a full-parameter config into the backend /backtest StrategyComponents,
 * reusing the exact block shapes from strategyDraft.ts + backtestRecipes.ts.
 *
 * Ported from TradLyte-app/lib/proStrategy.ts (mobile source of truth).
 * Only import paths differ from the mobile version.
 */
import { clampMaPeriod } from "./strategyDraft";
import type { ComponentBlock, StrategyComponents } from "./backtestRecipes";

/** History windows offered for a backtest (mirrors the mobile DATE_PRESETS). */
export const DATE_PRESETS = ["1M", "3M", "6M", "YTD", "1Y", "2Y", "3Y", "5Y"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export type MaType = "EMA" | "SMA";
export type CompareOperator = ">" | "<" | ">=" | "<=" | "==";
export interface MaRef { type: MaType; period: number; }

export interface ProStrategyConfig {
  strategyName: string;
  symbol: string;
  timeframe: string;
  dateMode: "preset" | "range";
  preset: DatePreset;
  startDate: string;
  endDate: string;
  initialCapital: number;
  setup:
    | { mode: "none" }
    | { mode: "indicator"; indicator: "RSI"; period: number; operator: CompareOperator; value: number }
    | { mode: "expression"; left: MaRef; op: "GT" | "LT"; right: MaRef };
  trigger:
    | { mode: "none" }
    | { mode: "candle_pattern"; pattern: string }
    | { mode: "crossover"; fast: MaRef; slow: MaRef; crossoverType: "GOLDEN_CROSS" | "DEATH_CROSS" }
    | { mode: "price_level"; level: number; direction: "ABOVE" | "BELOW" };
  exit:
    | { mode: "conditions"; takeProfitPct?: number; stopLossPct?: number; trailingPct?: number; anchorOffsetPct?: number }
    | { mode: "time"; maxHoldingDays: number }
    | { mode: "death_cross" };
}

function pctToDecimal(pct: number): number {
  const n = Number(pct);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}
function maIndicator(ref: MaRef) {
  return { indicator: ref.type, params: { period: clampMaPeriod(ref.period) } };
}
function maName(ref: MaRef): string {
  return `${ref.type.toLowerCase()}_${clampMaPeriod(ref.period)}`;
}

export function defaultProStrategyConfig(): ProStrategyConfig {
  return {
    strategyName: "pro_strategy",
    symbol: "AAPL",
    timeframe: "1d",
    dateMode: "preset",
    preset: "1Y",
    startDate: "",
    endDate: "",
    initialCapital: 10000,
    setup: { mode: "none" },
    trigger: { mode: "candle_pattern", pattern: "GREEN_CANDLE" },
    exit: { mode: "conditions", takeProfitPct: 10, stopLossPct: 5 },
  };
}

export function validateProStrategy(c: ProStrategyConfig): string | null {
  if (!c.symbol.trim()) return "Enter a symbol.";
  if (!Number.isFinite(c.initialCapital) || c.initialCapital <= 0) return "Initial capital must be positive.";
  if (c.dateMode === "range" && (!c.startDate || !c.endDate)) return "Pick a start and end date.";
  if (c.exit.mode === "conditions") {
    const any =
      c.exit.takeProfitPct != null || c.exit.stopLossPct != null ||
      c.exit.trailingPct != null || c.exit.anchorOffsetPct != null;
    if (!any) return "Select at least one exit condition.";
  }
  if (c.exit.mode === "time" && (!Number.isFinite(c.exit.maxHoldingDays) || c.exit.maxHoldingDays < 1))
    return "Max holding days must be at least 1.";
  return null;
}

function buildSetup(c: ProStrategyConfig, tf: string): ComponentBlock {
  const s = c.setup;
  if (s.mode === "none") return { type: "NONE", timeframe: tf };
  if (s.mode === "expression")
    return { type: "EXPRESSION", timeframe: tf, expression: { op: s.op, left: maIndicator(s.left), right: maIndicator(s.right) } };
  return { type: "INDICATOR_THRESHOLD", timeframe: tf, indicator: "RSI", params: { period: Math.floor(s.period) }, operator: s.operator, value: s.value };
}

function buildTrigger(c: ProStrategyConfig, tf: string): ComponentBlock {
  const t = c.trigger;
  switch (t.mode) {
    case "candle_pattern": return { type: "CANDLE_PATTERN", timeframe: tf, pattern: t.pattern };
    case "crossover": return { type: "INDICATOR_CROSSOVER", timeframe: tf, indicator1: maName(t.fast), indicator2: maName(t.slow), crossover_type: t.crossoverType };
    case "price_level": return { type: "PRICE_CROSSOVER", timeframe: tf, price_level: t.level, direction: t.direction };
    case "none":
    default: return { type: "CANDLE_PATTERN", timeframe: tf, pattern: "GREEN_CANDLE" };
  }
}

function buildExit(c: ProStrategyConfig, tf: string): ComponentBlock {
  const e = c.exit;
  if (e.mode === "time")
    return { type: "TIME_BASED", timeframe: tf, max_holding_days: Math.max(1, Math.floor(e.maxHoldingDays)) };
  if (e.mode === "death_cross")
    return { type: "EXPRESSION", timeframe: tf, expression: { op: "CROSS_BELOW", left: maIndicator({ type: "EMA", period: 8 }), right: maIndicator({ type: "EMA", period: 21 }) } };
  // conditions
  const conditions: ComponentBlock[] = [];
  if (e.stopLossPct != null) conditions.push({ type: "STOP_LOSS_PCT", value: pctToDecimal(e.stopLossPct) });
  if (e.takeProfitPct != null) conditions.push({ type: "TAKE_PROFIT_PCT", value: pctToDecimal(e.takeProfitPct) });
  if (e.trailingPct != null) conditions.push({ type: "TRAILING_STOP_PCT", value: pctToDecimal(e.trailingPct) });
  if (e.anchorOffsetPct != null) conditions.push({ type: "STOP_LOSS_ANCHOR", anchor: "ENTRY_LOW", offset_pct: pctToDecimal(e.anchorOffsetPct) });
  if (conditions.length === 1) return { ...conditions[0], timeframe: tf };
  return { type: "CONDITIONAL_OR_FIXED", timeframe: tf, conditions };
}

export function compileProStrategy(c: ProStrategyConfig): StrategyComponents {
  const tf = c.timeframe;
  return { setup: buildSetup(c, tf), trigger: buildTrigger(c, tf), exit: buildExit(c, tf) };
}
