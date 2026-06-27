import {
  suggestExperimentStrategyName,
  type ComponentBlock,
  type StrategyComponents,
} from "@/lib/backtestRecipes";

export type MaType = "SMA" | "EMA";

/** Comparison operators usable in a setup condition (incl. cross events). */
export type CompareOperator = ">" | "<" | ">=" | "<=" | "==" | "CROSS_ABOVE" | "CROSS_BELOW";

/**
 * Setup (lens): regime filter. The deployed engine accepts NONE / INDICATOR_THRESHOLD
 * / EXPRESSION setups only (candle-pattern setups are NOT supported — curl-verified).
 * - `rsi` / `ma_crossover` — friendly presets (kept for back-compat + lesson handoff).
 * - `indicator` — general structured condition: any registry indicator vs a value or
 *   another indicator. Single condition only (no nested AND/OR by design).
 */
export type SetupKind = "rsi" | "ma_crossover" | "indicator";

/** Trigger (entry): candle pattern, price level, or none (enter on the setup edge). */
export type TriggerMode = "none" | "candle_pattern" | "price_level";

/**
 * Exit rule families — all curl-verified against the deployed backtester.
 * (RANGE_BRACKET and STOP_LOSS_ANCHOR are documented in API_GUIDE.md but the
 * running engine rejects them, so they are intentionally absent here.)
 */
export type ExitMode =
  | "bracket"
  | "take_profit"
  | "stop_loss"
  | "trailing"
  | "time"
  | "death_cross"
  | "indicator_cross"
  | "stack";

/** Direction for an indicator-cross exit (the API uses UP/DOWN). */
export type CrossDirection = "UP" | "DOWN";
/** Oscillators with a natural threshold level, usable as an indicator-cross exit. */
export type ExitIndicatorId = "RSI" | "STOCH";

/** Indicators exposed by the serving INDICATOR_REGISTRY (API_GUIDE indicator reference). */
export type IndicatorId = "RSI" | "SMA" | "EMA" | "ATR" | "MACD" | "BB" | "STOCH";

export interface IndicatorMeta {
  id: IndicatorId;
  label: string;
  hasPeriod: boolean;
  defaultPeriod: number;
  /** Output column selector for multi-output indicators (MACD/BB/STOCH). */
  outputs?: { value: string; label: string }[];
  defaultOutput?: string;
}

export const INDICATORS: IndicatorMeta[] = [
  { id: "RSI", label: "RSI", hasPeriod: true, defaultPeriod: 14 },
  { id: "SMA", label: "SMA (simple average)", hasPeriod: true, defaultPeriod: 20 },
  { id: "EMA", label: "EMA (recent-weighted average)", hasPeriod: true, defaultPeriod: 21 },
  { id: "ATR", label: "ATR (volatility)", hasPeriod: true, defaultPeriod: 14 },
  {
    id: "MACD",
    label: "MACD",
    hasPeriod: false,
    defaultPeriod: 0,
    outputs: [
      { value: "macd", label: "MACD line" },
      { value: "signal", label: "Signal line" },
      { value: "hist", label: "Histogram" },
    ],
    defaultOutput: "macd",
  },
  {
    id: "BB",
    label: "Bollinger Bands",
    hasPeriod: true,
    defaultPeriod: 20,
    outputs: [
      { value: "upper", label: "Upper band" },
      { value: "middle", label: "Middle band" },
      { value: "lower", label: "Lower band" },
    ],
    defaultOutput: "upper",
  },
  {
    id: "STOCH",
    label: "Stochastic",
    hasPeriod: true,
    defaultPeriod: 14,
    outputs: [
      { value: "k", label: "%K" },
      { value: "d", label: "%D" },
    ],
    defaultOutput: "k",
  },
];

export function indicatorMeta(id: IndicatorId): IndicatorMeta {
  return INDICATORS.find((i) => i.id === id) ?? INDICATORS[0];
}

// ---------------------------------------------------------------------------
// Timeframes — raw 1d resampled to Fibonacci day-bars (API_GUIDE "Timeframes").
// ---------------------------------------------------------------------------

export const TIMEFRAMES = ["1d", "3d", "5d", "8d", "13d", "21d", "34d"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

const TIMEFRAME_LABELS: Record<string, string> = {
  "1d": "daily",
  "3d": "3-day",
  "5d": "weekly (5-day)",
  "8d": "8-day",
  "13d": "13-day",
  "21d": "monthly (21-day)",
  "34d": "34-day",
};

export function timeframeLabel(tf: string): string {
  return TIMEFRAME_LABELS[tf] ?? tf;
}

/** Index in TIMEFRAMES; higher = coarser. Unknown frames rank as the base (0). */
export function timeframeRank(tf: string): number {
  const i = TIMEFRAMES.indexOf(tf as Timeframe);
  return i < 0 ? 0 : i;
}

/** A frame is allowed for a coarser-or-equal component when its rank ≥ base rank. */
export function isCoarserOrEqual(tf: string, base: string): boolean {
  return timeframeRank(tf) >= timeframeRank(base);
}

// ---------------------------------------------------------------------------
// Draft model
// ---------------------------------------------------------------------------

/** One side of a general setup condition. */
export interface ConditionOperand {
  kind: "indicator" | "price" | "value";
  indicator: IndicatorId;
  period: number;
  output: string;
  value: number;
}

export interface SetupCondition {
  left: ConditionOperand;
  operator: CompareOperator;
  right: ConditionOperand;
}

/** One leaf in a stacked exit (OR-composed; first to fire wins). */
export type ExitLeafKind = "take_profit" | "stop_loss" | "trailing" | "signal_flip";

export interface ExitRuleSpec {
  kind: ExitLeafKind;
  pct?: number;
}

export interface StrategyDraft {
  strategyName: string;
  /** Base timeframe (finest). Components may run coarser, never finer. */
  timeframe: string;
  setup: {
    mode: "none" | "indicator";
    kind: SetupKind;
    // rsi preset
    indicator: "RSI";
    period: number;
    operator: CompareOperator;
    threshold: number;
    // ma_crossover preset
    fastType: MaType;
    fastPeriod: number;
    slowType: MaType;
    slowPeriod: number;
    // general structured condition (kind === "indicator")
    condition?: SetupCondition;
    /** Multi-timeframe: run the filter on a coarser frame (undefined → base). */
    timeframe?: string;
  };
  trigger: {
    mode: TriggerMode;
    pattern: string;
    priceLevel: number;
    priceDirection: "ABOVE" | "BELOW";
  };
  exit: {
    mode: ExitMode;
    takeProfitPct: number;
    stopLossPct: number;
    trailingStopPct: number;
    maxHoldingDays: number;
    // indicator-cross exit (mode === "indicator_cross")
    exitIndicator?: ExitIndicatorId;
    exitPeriod?: number;
    exitOutput?: string;
    exitDirection?: CrossDirection;
    exitValue?: number;
    // stacked rules (mode === "stack")
    stack?: ExitRuleSpec[];
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

function defaultOperand(kind: ConditionOperand["kind"], indicator: IndicatorId): ConditionOperand {
  const meta = indicatorMeta(indicator);
  return {
    kind,
    indicator,
    period: meta.defaultPeriod || 14,
    output: meta.defaultOutput ?? "",
    value: 50,
  };
}

export function defaultSetupCondition(): SetupCondition {
  return {
    left: defaultOperand("indicator", "RSI"),
    operator: ">",
    right: { ...defaultOperand("value", "RSI"), kind: "value", value: 50 },
  };
}

// --- Operand constructors + per-indicator condition presets (setup tile grid) ---

export function priceOperand(): ConditionOperand {
  return { kind: "price", indicator: "EMA", period: 0, output: "", value: 0 };
}
export function valueOperand(v: number): ConditionOperand {
  return { kind: "value", indicator: "RSI", period: 0, output: "", value: v };
}
export function indicatorOperand(id: IndicatorId, period?: number, output?: string): ConditionOperand {
  const m = indicatorMeta(id);
  return { kind: "indicator", indicator: id, period: period ?? (m.defaultPeriod || 14), output: output ?? (m.defaultOutput ?? ""), value: 0 };
}

/** A natural starting condition for each indicator tile (price-vs-MA, line cross, etc.). */
export function conditionPreset(id: IndicatorId): SetupCondition {
  switch (id) {
    case "EMA":
      return { left: priceOperand(), operator: "CROSS_ABOVE", right: indicatorOperand("EMA", 21) };
    case "SMA":
      return { left: priceOperand(), operator: "CROSS_ABOVE", right: indicatorOperand("SMA", 50) };
    case "MACD":
      return { left: indicatorOperand("MACD", 0, "macd"), operator: "CROSS_ABOVE", right: indicatorOperand("MACD", 0, "signal") };
    case "BB":
      return { left: priceOperand(), operator: "CROSS_BELOW", right: indicatorOperand("BB", 20, "lower") };
    case "STOCH":
      return { left: indicatorOperand("STOCH", 14, "k"), operator: "<", right: valueOperand(20) };
    case "ATR":
      return { left: indicatorOperand("ATR", 14), operator: ">", right: valueOperand(1) };
    default:
      return defaultSetupCondition();
  }
}

export interface SetupTile {
  key: string;
  label: string;
  group: "simple" | "more";
  indicator?: IndicatorId;
  /** Glossary key for the inline explainer. */
  term?: string;
  /** Mini-visual key (StrategyLabVisuals). */
  visual?: string;
}

/** Setup lenses shown as a grid; "simple" leads with the most-used lenses. */
export const SETUP_TILES: SetupTile[] = [
  { key: "none", label: "No filter", group: "simple", term: "setup" },
  { key: "rsi", label: "Momentum (RSI)", group: "simple", term: "RSI" },
  { key: "trend", label: "Trend (MA cross)", group: "simple", term: "EMA" },
  { key: "EMA", label: "Price vs EMA", group: "simple", indicator: "EMA", term: "EMA" },
  { key: "MACD", label: "MACD cross", group: "simple", indicator: "MACD", term: "MACD" },
  { key: "SMA", label: "Price vs SMA", group: "more", indicator: "SMA", term: "SMA" },
  { key: "BB", label: "Bollinger Bands", group: "more", indicator: "BB", term: "BB" },
  { key: "STOCH", label: "Stochastic", group: "more", indicator: "STOCH", term: "STOCH" },
  { key: "ATR", label: "Volatility (ATR)", group: "more", indicator: "ATR", term: "ATR" },
  { key: "custom", label: "Custom condition", group: "more", term: "setup" },
];

/** Best-effort active tile key for the current draft (recipe/lesson loads land here). */
export function deriveSetupTileKey(draft: StrategyDraft): string {
  const s = draft.setup;
  if (s.mode === "none") return "none";
  if (s.kind === "rsi") return "rsi";
  if (s.kind === "ma_crossover") return "trend";
  const cond = s.condition;
  if (cond) {
    const subject = cond.left.kind === "indicator" ? cond.left.indicator : cond.right.indicator;
    if (SETUP_TILES.some((t) => t.key === subject)) return subject;
  }
  return "custom";
}

/** The setup patch that selecting a tile applies (seeds a fresh condition). */
export function setupPatchForTile(key: string): Partial<StrategyDraft["setup"]> {
  if (key === "none") return { mode: "none" };
  if (key === "rsi") return { mode: "indicator", kind: "rsi", indicator: "RSI", period: 14, operator: ">", threshold: 50 };
  if (key === "trend") return { mode: "indicator", kind: "ma_crossover", fastType: "EMA", fastPeriod: 8, slowType: "EMA", slowPeriod: 21 };
  if (key === "custom") return { mode: "indicator", kind: "indicator", condition: defaultSetupCondition() };
  return { mode: "indicator", kind: "indicator", condition: conditionPreset(key as IndicatorId) };
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
      condition: defaultSetupCondition(),
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
      exitIndicator: "RSI",
      exitPeriod: 14,
      exitOutput: "",
      exitDirection: "DOWN",
      exitValue: 50,
      stack: [
        { kind: "stop_loss", pct: 5 },
        { kind: "take_profit", pct: 10 },
      ],
    },
  };
}

/** UI percent fields store the percent number (5 = 5%); always scale to a fraction. */
function pctToDecimal(pct: number): number {
  const n = Number(pct);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
}

function numOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value as number) ? (value as number) : fallback;
}

const EXPR_OP: Record<CompareOperator, string> = {
  ">": "GT",
  "<": "LT",
  ">=": "GTE",
  "<=": "LTE",
  "==": "EQ",
  CROSS_ABOVE: "CROSS_ABOVE",
  CROSS_BELOW: "CROSS_BELOW",
};

/** Build an EXPRESSION operand (registry-name form) from a condition operand. */
function exprOperand(op: ConditionOperand): ComponentBlock {
  if (op.kind === "price") return { price: "close" };
  if (op.kind === "value") return { const: op.value };
  const meta = indicatorMeta(op.indicator);
  if (meta.outputs) {
    // MACD/BB/STOCH select an output column; BB/STOCH also take a period.
    const out: ComponentBlock = { indicator: op.indicator, output: op.output || meta.defaultOutput };
    if (meta.hasPeriod) out.params = { period: clampMaPeriod(op.period) };
    return out;
  }
  return { indicator: op.indicator, params: { period: clampMaPeriod(op.period) } };
}

/** Compile a general structured condition into INDICATOR_THRESHOLD or EXPRESSION. */
function buildConditionBlock(cond: SetupCondition, tf: string): ComponentBlock {
  const { left, operator, right } = cond;
  const simpleCompare = operator === ">" || operator === "<" || operator === ">=" || operator === "<=";
  const leftMeta = indicatorMeta(left.indicator);
  // Clean threshold form: single periodic indicator (no output column) vs a constant.
  if (simpleCompare && right.kind === "value" && left.kind === "indicator" && !leftMeta.outputs) {
    return {
      type: "INDICATOR_THRESHOLD",
      timeframe: tf,
      indicator: left.indicator,
      params: { period: clampMaPeriod(left.period) },
      operator,
      value: right.value,
    };
  }
  return {
    type: "EXPRESSION",
    timeframe: tf,
    expression: { op: EXPR_OP[operator], left: exprOperand(left), right: exprOperand(right) },
  };
}

export function setupTimeframe(draft: StrategyDraft): string {
  const tf = draft.setup.timeframe;
  return tf && isCoarserOrEqual(tf, draft.timeframe) ? tf : draft.timeframe;
}

export function buildSetupBlock(draft: StrategyDraft): ComponentBlock {
  const tf = setupTimeframe(draft);
  const s = draft.setup;

  if (s.mode === "none") return { type: "NONE", timeframe: tf };

  switch (s.kind) {
    case "ma_crossover":
      return {
        type: "EXPRESSION",
        timeframe: tf,
        expression: {
          op: "GT",
          left: maIndicator(s.fastType, s.fastPeriod),
          right: maIndicator(s.slowType, s.slowPeriod),
        },
      };
    case "indicator":
      return buildConditionBlock(s.condition ?? defaultSetupCondition(), tf);
    case "rsi":
    default:
      return {
        type: "INDICATOR_THRESHOLD",
        timeframe: tf,
        indicator: "RSI",
        params: { period: s.period },
        operator: s.operator === "CROSS_ABOVE" || s.operator === "CROSS_BELOW" ? ">" : s.operator,
        value: s.threshold,
      };
  }
}

/**
 * Trigger block, or `null` to OMIT the trigger entirely.
 * Omitting → BUY fires on each bar where `setup_valid` flips false→true
 * (the "setup-edge" entry; how crossover strategies are expressed now).
 */
export function buildTriggerBlock(draft: StrategyDraft): ComponentBlock | null {
  const tf = draft.timeframe; // trigger MUST run on the base timeframe (API constraint)
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
      return null;
  }
}

/** Signal-flip exit: the fast average crossing back below the slow one. */
function signalFlipBlock(draft: StrategyDraft): ComponentBlock {
  const s = draft.setup;
  const useSetupMa = s.mode === "indicator" && s.kind === "ma_crossover";
  return {
    type: "EXPRESSION",
    expression: {
      op: "CROSS_BELOW",
      left: useSetupMa ? maIndicator(s.fastType, s.fastPeriod) : maIndicator("EMA", 8),
      right: useSetupMa ? maIndicator(s.slowType, s.slowPeriod) : maIndicator("EMA", 21),
    },
  };
}

function exitLeaf(rule: ExitRuleSpec, draft: StrategyDraft): ComponentBlock {
  switch (rule.kind) {
    case "take_profit":
      return { type: "TAKE_PROFIT_PCT", value: pctToDecimal(numOr(rule.pct, 10)) };
    case "stop_loss":
      return { type: "STOP_LOSS_PCT", value: pctToDecimal(numOr(rule.pct, 5)) };
    case "trailing":
      return { type: "TRAILING_STOP_PCT", value: pctToDecimal(numOr(rule.pct, 5)) };
    case "signal_flip":
    default:
      return signalFlipBlock(draft);
  }
}

/** Resolved column name for an indicator-cross exit (e.g. "rsi_14", "stoch_k_14_3"). */
function exitColumn(draft: StrategyDraft): string {
  const e = draft.exit;
  if (e.exitIndicator === "STOCH") return `stoch_${e.exitOutput || "k"}_14_3`;
  return `rsi_${clampMaPeriod(e.exitPeriod ?? 14)}`;
}

export function buildExitBlock(draft: StrategyDraft): ComponentBlock {
  const tf = draft.timeframe;
  const e = draft.exit;

  switch (e.mode) {
    case "take_profit":
      return { type: "TAKE_PROFIT_PCT", timeframe: tf, value: pctToDecimal(e.takeProfitPct) };
    case "stop_loss":
      return { type: "STOP_LOSS_PCT", timeframe: tf, value: pctToDecimal(e.stopLossPct) };
    case "trailing":
      return { type: "TRAILING_STOP_PCT", timeframe: tf, value: pctToDecimal(e.trailingStopPct) };
    case "time":
      return { type: "TIME_BASED", timeframe: tf, max_holding_days: Math.max(1, Math.floor(e.maxHoldingDays)) };
    case "indicator_cross":
      return {
        type: "INDICATOR_CROSS",
        timeframe: tf,
        indicator: exitColumn(draft),
        direction: e.exitDirection ?? "DOWN",
        value: numOr(e.exitValue, 50),
      };
    case "death_cross":
      return { ...signalFlipBlock(draft), timeframe: tf };
    case "stack": {
      const rules = (e.stack ?? []).filter(Boolean);
      const conditions = rules.map((r) => exitLeaf(r, draft));
      if (conditions.length === 1) return { ...conditions[0], timeframe: tf };
      return { type: "CONDITIONAL_OR_FIXED", timeframe: tf, conditions };
    }
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
  const trigger = buildTriggerBlock(draft);
  const components: StrategyComponents = { setup: buildSetupBlock(draft), exit: buildExitBlock(draft) };
  if (trigger) components.trigger = trigger;
  return components;
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
  // Builders already stamp each block's timeframe (base + any coarser setup frame).
  const components = buildComponentsFromDraft(draft);
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
 * Editable draft for a preset recipe. Recipes that can't be represented as a
 * single guided draft return null and run from their component definition instead.
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
        trigger: { ...base.trigger, mode: "none" },
        exit: { ...base.exit, mode: "stop_loss", stopLossPct: 5 },
      };
    case "rsi_oversold_bounce":
      return {
        ...base,
        strategyName: "rsi_oversold_bounce",
        setup: { ...base.setup, mode: "indicator", kind: "rsi", period: 14, operator: "<", threshold: 20 },
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
    case "hammer_rsi_exit":
      return {
        ...base,
        strategyName: "hammer_rsi_exit",
        setup: { ...base.setup, mode: "none", kind: "rsi" },
        trigger: { ...base.trigger, mode: "candle_pattern", pattern: "HAMMER" },
        exit: { ...base.exit, mode: "indicator_cross", exitIndicator: "RSI", exitPeriod: 14, exitDirection: "DOWN", exitValue: 45 },
      };
    case "weekly_trend_daily_entry":
      return {
        ...base,
        strategyName: "weekly_trend_daily_entry",
        setup: {
          ...base.setup,
          mode: "indicator",
          kind: "rsi",
          period: 14,
          operator: ">",
          threshold: 50,
          timeframe: "5d",
        },
        trigger: { ...base.trigger, mode: "candle_pattern", pattern: "BULLISH_ENGULFING" },
        exit: { ...base.exit, mode: "trailing", trailingStopPct: 6 },
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Pro-config migration — old /strategy-pro saved configs → unified draft.
// Crossover triggers (removed from the API) migrate to a setup-edge entry.
// ---------------------------------------------------------------------------

interface LegacyMaRef {
  type: MaType;
  period: number;
}
interface LegacyProConfig {
  strategyName?: string;
  timeframe?: string;
  setup?: Record<string, unknown>;
  trigger?: Record<string, unknown>;
  exit?: Record<string, unknown>;
}

/** True when a saved draft JSON is actually an old ProStrategyConfig. */
export function isLegacyProConfig(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as { _source?: string; setup?: { mode?: string }; trigger?: { mode?: string } };
  if (v._source === "pro") return true;
  // Pro setups use mode "expression"; triggers use mode "crossover" — neither exists in the guided model.
  return v.setup?.mode === "expression" || v.trigger?.mode === "crossover";
}

export function proConfigToDraft(config: unknown): StrategyDraft {
  const c = (config ?? {}) as LegacyProConfig;
  const draft = defaultStrategyDraft();
  draft.strategyName = c.strategyName || "imported_strategy";
  draft.timeframe = (c.timeframe as string) || "1d";

  const s = (c.setup ?? {}) as Record<string, unknown>;
  if (s.mode === "indicator") {
    draft.setup = {
      ...draft.setup,
      mode: "indicator",
      kind: "rsi",
      period: Number(s.period) || 14,
      operator: (s.operator as CompareOperator) || ">",
      threshold: Number(s.value) || 50,
    };
  } else if (s.mode === "expression") {
    const left = s.left as LegacyMaRef | undefined;
    const right = s.right as LegacyMaRef | undefined;
    draft.setup = {
      ...draft.setup,
      mode: "indicator",
      kind: "ma_crossover",
      fastType: left?.type || "EMA",
      fastPeriod: left?.period || 8,
      slowType: right?.type || "EMA",
      slowPeriod: right?.period || 21,
    };
  }

  const t = (c.trigger ?? {}) as Record<string, unknown>;
  if (t.mode === "crossover") {
    // Indicator-crossover triggers were removed — re-express as a setup-edge cross.
    const fast = t.fast as LegacyMaRef | undefined;
    const slow = t.slow as LegacyMaRef | undefined;
    const golden = (t.crossoverType as string) !== "DEATH_CROSS";
    draft.setup = {
      ...draft.setup,
      mode: "indicator",
      kind: "indicator",
      condition: {
        left: { ...defaultOperand("indicator", (fast?.type as IndicatorId) || "EMA"), period: fast?.period || 8 },
        operator: golden ? "CROSS_ABOVE" : "CROSS_BELOW",
        right: { ...defaultOperand("indicator", (slow?.type as IndicatorId) || "EMA"), period: slow?.period || 21 },
      },
    };
    draft.trigger = { ...draft.trigger, mode: "none" };
  } else if (t.mode === "candle_pattern") {
    draft.trigger = { ...draft.trigger, mode: "candle_pattern", pattern: (t.pattern as string) || "GREEN_CANDLE" };
  } else if (t.mode === "price_level") {
    draft.trigger = {
      ...draft.trigger,
      mode: "price_level",
      priceLevel: Number(t.level) || 100,
      priceDirection: (t.direction as "ABOVE" | "BELOW") || "ABOVE",
    };
  } else {
    draft.trigger = { ...draft.trigger, mode: "none" };
  }

  const e = (c.exit ?? {}) as Record<string, unknown>;
  if (e.mode === "time") {
    draft.exit = { ...draft.exit, mode: "time", maxHoldingDays: Number(e.maxHoldingDays) || 10 };
  } else if (e.mode === "death_cross") {
    draft.exit = { ...draft.exit, mode: "death_cross" };
  } else if (e.mode === "conditions") {
    const stack: ExitRuleSpec[] = [];
    if (e.stopLossPct != null) stack.push({ kind: "stop_loss", pct: Number(e.stopLossPct) });
    // Structural-stop offsets (removed from the engine) become a plain stop loss.
    if (e.anchorOffsetPct != null && e.stopLossPct == null) stack.push({ kind: "stop_loss", pct: Number(e.anchorOffsetPct) });
    if (e.takeProfitPct != null) stack.push({ kind: "take_profit", pct: Number(e.takeProfitPct) });
    if (e.trailingPct != null) stack.push({ kind: "trailing", pct: Number(e.trailingPct) });
    if (stack.length === 1) {
      const only = stack[0];
      if (only.kind === "take_profit") draft.exit = { ...draft.exit, mode: "take_profit", takeProfitPct: only.pct ?? 10 };
      else if (only.kind === "trailing") draft.exit = { ...draft.exit, mode: "trailing", trailingStopPct: only.pct ?? 5 };
      else draft.exit = { ...draft.exit, mode: "stop_loss", stopLossPct: only.pct ?? 5 };
    } else if (stack.length > 1) {
      draft.exit = { ...draft.exit, mode: "stack", stack };
    }
  }
  return draft;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateDraft(draft: StrategyDraft): string | null {
  if (!TIMEFRAMES.includes(draft.timeframe as Timeframe)) {
    return "Pick a chart timeframe.";
  }

  const s = draft.setup;
  if (s.timeframe && !isCoarserOrEqual(s.timeframe, draft.timeframe)) {
    return "The setup timeframe must be the same or coarser than the chart timeframe.";
  }

  if (s.mode === "indicator") {
    if (s.kind === "rsi") {
      if (s.period < 2) return "RSI period must be at least 2.";
      if (!Number.isFinite(s.threshold) || s.threshold < 0 || s.threshold > 100) {
        return "RSI level must be between 0 and 100.";
      }
    }
    if (s.kind === "ma_crossover") {
      if (s.fastPeriod < 2 || s.slowPeriod < 2) return "Moving-average periods must be at least 2.";
      if (s.fastPeriod >= s.slowPeriod) return "The fast average should be shorter than the slow average.";
    }
    if (s.kind === "indicator") {
      const cond = s.condition ?? defaultSetupCondition();
      const leftMeta = indicatorMeta(cond.left.indicator);
      if (leftMeta.hasPeriod && cond.left.period < 2) return "Indicator period must be at least 2.";
      if (cond.right.kind === "value" && !Number.isFinite(cond.right.value)) {
        return "Enter a number to compare against.";
      }
    }
  }

  const t = draft.trigger;
  if (t.mode === "price_level" && (!Number.isFinite(t.priceLevel) || t.priceLevel <= 0)) {
    return "Enter a valid price level for the entry.";
  }

  const e = draft.exit;
  if (e.mode === "bracket" && (e.takeProfitPct <= 0 || e.stopLossPct <= 0)) {
    return "Stop loss and take profit must be positive percentages.";
  }
  if (e.mode === "indicator_cross" && !Number.isFinite(e.exitValue as number)) {
    return "Enter a level for the indicator exit.";
  }
  if (e.mode === "stack" && (!e.stack || e.stack.length === 0)) {
    return "Add at least one exit rule.";
  }
  if (e.mode === "death_cross" && s.mode === "indicator" && s.kind !== "ma_crossover") {
    return "Signal-flip exit works best when your setup uses a moving-average trend filter.";
  }
  return null;
}
