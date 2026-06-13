import {
  applyTimeframeToComponents,
  suggestExperimentStrategyName,
  type ComponentBlock,
  type StrategyComponents,
} from "@/lib/backtestRecipes";

export type MaType = "SMA" | "EMA";
export type CompareOperator = ">" | "<" | ">=" | "<=" | "==";

/** Setup (lens): regime filter — NONE or indicator condition. */
export type SetupKind = "rsi" | "ma_crossover";

/** Trigger (entry): candle pattern, price level, or no extra rule. */
export type TriggerMode = "none" | "candle_pattern" | "price_level";

export interface StrategyDraft {
  strategyName: string;
  timeframe: string;
  setup: {
    mode: "none" | "indicator";
    kind: SetupKind;
    indicator: "RSI";
    period: number;
    operator: CompareOperator;
    threshold: number;
    fastType: MaType;
    fastPeriod: number;
    slowType: MaType;
    slowPeriod: number;
  };
  trigger: {
    mode: TriggerMode;
    pattern: string;
    priceLevel: number;
    priceDirection: "ABOVE" | "BELOW";
  };
  exit: {
    mode: "bracket" | "take_profit" | "stop_loss" | "trailing" | "time" | "death_cross";
    takeProfitPct: number;
    stopLossPct: number;
    trailingStopPct: number;
    maxHoldingDays: number;
  };
}

export const CANDLE_PATTERNS = [
  { value: "GREEN_CANDLE", label: "Green candle" },
  { value: "RED_CANDLE", label: "Red candle" },
  { value: "BULLISH_ENGULFING", label: "Bullish engulfing" },
  { value: "BEARISH_ENGULFING", label: "Bearish engulfing" },
  { value: "HAMMER", label: "Hammer" },
  { value: "SHOOTING_STAR", label: "Shooting star" },
  { value: "DOJI", label: "Doji" },
  { value: "MORNING_STAR", label: "Morning star" },
  { value: "EVENING_STAR", label: "Evening star" },
] as const;

export const SUGGESTED_EMA_PERIODS = [8, 13, 21, 55, 89, 144, 169] as const;
export const SUGGESTED_SMA_PERIODS = [20, 50, 200] as const;

export function suggestedMaPeriods(type: MaType): readonly number[] {
  return type === "EMA" ? SUGGESTED_EMA_PERIODS : SUGGESTED_SMA_PERIODS;
}

export function clampMaPeriod(period: number): number {
  const n = Math.floor(Number(period));
  if (!Number.isFinite(n)) return 21;
  return Math.min(500, Math.max(2, n));
}

export const supportedMaPeriods = suggestedMaPeriods;
export function normalizeMaPeriod(_type: MaType, period: number): number {
  return clampMaPeriod(period);
}

function maIndicator(type: MaType, period: number) {
  return { indicator: type, params: { period: clampMaPeriod(period) } };
}

export function defaultStrategyDraft(): StrategyDraft {
  return {
    strategyName: "custom_strategy",
    timeframe: "1d",
    setup: {
      mode: "none",
      kind: "rsi",
      indicator: "RSI",
      period: 14,
      operator: ">",
      threshold: 50,
      fastType: "EMA",
      fastPeriod: 8,
      slowType: "EMA",
      slowPeriod: 21,
    },
    trigger: {
      mode: "candle_pattern",
      pattern: "GREEN_CANDLE",
      priceLevel: 100,
      priceDirection: "ABOVE",
    },
    exit: {
      mode: "bracket",
      takeProfitPct: 10,
      stopLossPct: 5,
      trailingStopPct: 3,
      maxHoldingDays: 10,
    },
  };
}

function pctToDecimal(pct: number): number {
  const n = Number(pct);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

export function buildSetupBlock(draft: StrategyDraft): ComponentBlock {
  const tf = draft.timeframe;
  const s = draft.setup;

  if (s.mode === "none") {
    return { type: "NONE", timeframe: tf };
  }

  if (s.kind === "ma_crossover") {
    return {
      type: "EXPRESSION",
      timeframe: tf,
      expression: {
        op: "GT",
        left: maIndicator(s.fastType, s.fastPeriod),
        right: maIndicator(s.slowType, s.slowPeriod),
      },
    };
  }

  return {
    type: "INDICATOR_THRESHOLD",
    timeframe: tf,
    indicator: "RSI",
    params: { period: s.period },
    operator: s.operator,
    value: s.threshold,
  };
}

export function buildTriggerBlock(draft: StrategyDraft): ComponentBlock {
  const tf = draft.timeframe;
  const t = draft.trigger;

  switch (t.mode) {
    case "candle_pattern":
      return { type: "CANDLE_PATTERN", timeframe: tf, pattern: t.pattern };
    case "price_level":
      return {
        type: "PRICE_CROSSOVER",
        timeframe: tf,
        price_level: t.priceLevel,
        direction: t.priceDirection,
      };
    case "none":
    default:
      // Permissive entry when lens passes — matches smoke-test style.
      return { type: "CANDLE_PATTERN", timeframe: tf, pattern: "GREEN_CANDLE" };
  }
}

export function buildExitBlock(draft: StrategyDraft): ComponentBlock {
  const tf = draft.timeframe;
  const e = draft.exit;
  const s = draft.setup;

  switch (e.mode) {
    case "take_profit":
      return { type: "TAKE_PROFIT_PCT", timeframe: tf, value: pctToDecimal(e.takeProfitPct) };
    case "stop_loss":
      return { type: "STOP_LOSS_PCT", timeframe: tf, value: pctToDecimal(e.stopLossPct) };
    case "trailing":
      return { type: "TRAILING_STOP_PCT", timeframe: tf, value: pctToDecimal(e.trailingStopPct) };
    case "time":
      return { type: "TIME_BASED", timeframe: tf, max_holding_days: Math.max(1, Math.floor(e.maxHoldingDays)) };
    case "death_cross":
      if (s.mode === "indicator" && s.kind === "ma_crossover") {
        return {
          type: "EXPRESSION",
          timeframe: tf,
          expression: {
            op: "CROSS_BELOW",
            left: maIndicator(s.fastType, s.fastPeriod),
            right: maIndicator(s.slowType, s.slowPeriod),
          },
        };
      }
      return {
        type: "EXPRESSION",
        timeframe: tf,
        expression: {
          op: "CROSS_BELOW",
          left: maIndicator("EMA", 8),
          right: maIndicator("EMA", 21),
        },
      };
    case "bracket":
    default:
      return {
        type: "CONDITIONAL_OR_FIXED",
        timeframe: tf,
        conditions: [
          { type: "STOP_LOSS_PCT", value: pctToDecimal(e.stopLossPct) },
          { type: "TAKE_PROFIT_PCT", value: pctToDecimal(e.takeProfitPct) },
        ],
      };
  }
}

export function buildComponentsFromDraft(draft: StrategyDraft): StrategyComponents {
  return {
    setup: buildSetupBlock(draft),
    trigger: buildTriggerBlock(draft),
    exit: buildExitBlock(draft),
  };
}

export interface BacktestRequestBody {
  strategy_name: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  components: StrategyComponents;
}

export function buildBacktestRequest(
  draft: StrategyDraft,
  opts: { symbol: string; startDate: string; endDate: string; initialCapital: number },
): BacktestRequestBody {
  const components = applyTimeframeToComponents(buildComponentsFromDraft(draft), draft.timeframe);
  const name = draft.strategyName.trim() || suggestExperimentStrategyName(components);
  return {
    strategy_name: name,
    symbol: opts.symbol.trim().toUpperCase(),
    timeframe: draft.timeframe,
    start_date: opts.startDate,
    end_date: opts.endDate,
    initial_capital: opts.initialCapital,
    components,
  };
}

/**
 * Editable guided-flow draft for recipes the guided model can represent.
 * MACD-crossover recipes return null (not expressible here) and run from their
 * component definition in BACKTEST_RECIPES instead.
 */
export function draftFromRecipeId(recipeId: string): StrategyDraft | null {
  const base = defaultStrategyDraft();
  switch (recipeId) {
    case "golden_cross_20_50":
      return {
        ...base,
        strategyName: "golden_cross_20_50",
        setup: {
          ...base.setup,
          mode: "indicator",
          kind: "ma_crossover",
          fastType: "SMA",
          fastPeriod: 20,
          slowType: "SMA",
          slowPeriod: 50,
        },
        trigger: { ...base.trigger, mode: "candle_pattern", pattern: "GREEN_CANDLE" },
        exit: { ...base.exit, mode: "stop_loss", stopLossPct: 5 },
      };
    case "rsi_oversold_bounce":
      return {
        ...base,
        strategyName: "rsi_oversold_bounce",
        setup: {
          ...base.setup,
          mode: "indicator",
          kind: "rsi",
          period: 14,
          operator: "<",
          threshold: 20,
        },
        trigger: { ...base.trigger, mode: "candle_pattern", pattern: "GREEN_CANDLE" },
        exit: { ...base.exit, mode: "stop_loss", stopLossPct: 5 },
      };
    case "ema_8_13_cross":
      return {
        ...base,
        strategyName: "ema_8_13_cross",
        setup: {
          ...base.setup,
          mode: "indicator",
          kind: "ma_crossover",
          fastType: "EMA",
          fastPeriod: 8,
          slowType: "EMA",
          slowPeriod: 13,
        },
        trigger: { ...base.trigger, mode: "none" },
        exit: { ...base.exit, mode: "bracket", takeProfitPct: 15, stopLossPct: 4 },
      };
    default:
      return null;
  }
}

export function validateDraft(draft: StrategyDraft): string | null {
  const s = draft.setup;
  if (s.mode === "indicator") {
    if (s.kind === "rsi") {
      if (s.period < 2) return "RSI period must be at least 2";
      if (!Number.isFinite(s.threshold) || s.threshold < 0 || s.threshold > 100) {
        return "RSI threshold must be between 0 and 100";
      }
    }
    if (s.kind === "ma_crossover") {
      if (s.fastPeriod < 2 || s.slowPeriod < 2) return "Moving-average periods must be at least 2 days";
      if (s.fastPeriod >= s.slowPeriod) return "Fast MA period should be shorter than slow MA period";
    }
  }

  const t = draft.trigger;
  if (t.mode === "price_level" && (!Number.isFinite(t.priceLevel) || t.priceLevel <= 0)) {
    return "Enter a valid price level for the entry trigger";
  }

  const e = draft.exit;
  if (e.mode === "bracket" && (e.takeProfitPct <= 0 || e.stopLossPct <= 0)) {
    return "Stop-loss and take-profit must be positive percentages";
  }
  if (e.mode === "death_cross" && s.mode === "indicator" && s.kind !== "ma_crossover") {
    return "Signal-flip exit works best when your lens uses a moving-average trend filter";
  }
  return null;
}
