/** Shapes match serving `/backtest` `components`: setup, optional trigger, optional exit. */

export type ComponentBlock = Record<string, unknown>;

export interface StrategyComponents {
  setup: ComponentBlock;
  /** Omit to enter on the setup edge (BUY when setup_valid flips false→true). */
  trigger?: ComponentBlock;
  /** Omit to ride the position to end_of_data. */
  exit?: ComponentBlock;
}

export interface BacktestRecipe {
  id: string;
  title: string;
  description: string;
  strategy_name: string;
  components: StrategyComponents;
}

// Fibonacci day-bar order (kept local to avoid a cycle with strategyDraft.ts).
const TF_ORDER = ["1d", "3d", "5d", "8d", "13d", "21d", "34d"];
function tfRank(tf: unknown): number {
  const i = TF_ORDER.indexOf(String(tf));
  return i < 0 ? 0 : i;
}

function componentsFrom(recipe: StrategyComponents): StrategyComponents {
  const out: StrategyComponents = { setup: { ...recipe.setup } };
  if (recipe.trigger) out.trigger = { ...recipe.trigger };
  if (recipe.exit) out.exit = structuredCloneStructuredExit(recipe.exit);
  return out;
}

function structuredCloneStructuredExit(exit: ComponentBlock): ComponentBlock {
  const raw = exit.conditions;
  if (Array.isArray(raw)) {
    return {
      ...exit,
      conditions: raw.map((c) => (c && typeof c === "object" ? { ...(c as object) } : c)),
    };
  }
  return { ...exit };
}

/**
 * Beginner-friendly preset strategies, each valid against the live `/backtest`
 * endpoint. Plain-language titles + one-line "what it does" descriptions.
 *
 * Crossover entries live in `setup` with the trigger omitted (setup-edge entry):
 * the API removed indicator-crossover and expression triggers.
 */
export const BACKTEST_RECIPES: BacktestRecipe[] = [
  {
    id: "golden_cross_20_50",
    title: "The Golden Cross",
    description:
      "The classic trend signal — when the 20-day average rises above the 50-day, the trend has turned up. Enter on the cross, protect it with a 5% stop loss.",
    strategy_name: "golden_cross_20_50",
    components: {
      setup: {
        type: "EXPRESSION",
        timeframe: "1d",
        expression: {
          op: "CROSS_ABOVE",
          left: { indicator: "SMA", params: { period: 20 } },
          right: { indicator: "SMA", params: { period: 50 } },
        },
      },
      exit: { type: "STOP_LOSS_PCT", timeframe: "1d", value: 0.05 },
    },
  },
  {
    id: "rsi_oversold_bounce",
    title: "RSI Oversold Bounce",
    description:
      "When RSI drops below 20 a stock is deeply oversold. Wait for the first green candle to confirm a bounce, then buy with a 5% stop loss.",
    strategy_name: "rsi_oversold_bounce",
    components: {
      setup: {
        type: "INDICATOR_THRESHOLD",
        timeframe: "1d",
        indicator: "RSI",
        params: { period: 14 },
        operator: "<",
        value: 20,
      },
      trigger: { type: "CANDLE_PATTERN", timeframe: "1d", pattern: "GREEN_CANDLE" },
      exit: { type: "STOP_LOSS_PCT", timeframe: "1d", value: 0.05 },
    },
  },
  {
    id: "macd_golden_cross",
    title: "MACD Golden Cross",
    description:
      "Momentum turning up — enter when the MACD line crosses above its signal line. Exits on a 5% stop or a 12% profit target.",
    strategy_name: "macd_golden_cross",
    components: {
      setup: {
        type: "EXPRESSION",
        timeframe: "1d",
        expression: {
          op: "CROSS_ABOVE",
          left: { indicator: "MACD", output: "macd" },
          right: { indicator: "MACD", output: "signal" },
        },
      },
      exit: {
        type: "CONDITIONAL_OR_FIXED",
        timeframe: "1d",
        conditions: [
          { type: "STOP_LOSS_PCT", value: 0.05 },
          { type: "TAKE_PROFIT_PCT", value: 0.12 },
        ],
      },
    },
  },
  {
    id: "ema_8_13_cross",
    title: "Fast EMA Cross (8 / 13)",
    description:
      "An advanced, faster trend trigger — enter the moment the 8-day EMA crosses above the 13-day. Exits on a 4% stop or a 15% target.",
    strategy_name: "ema_8_13_cross",
    components: {
      setup: {
        type: "EXPRESSION",
        timeframe: "1d",
        expression: {
          op: "CROSS_ABOVE",
          left: { indicator: "EMA", params: { period: 8 } },
          right: { indicator: "EMA", params: { period: 13 } },
        },
      },
      exit: {
        type: "CONDITIONAL_OR_FIXED",
        timeframe: "1d",
        conditions: [
          { type: "STOP_LOSS_PCT", value: 0.04 },
          { type: "TAKE_PROFIT_PCT", value: 0.15 },
        ],
      },
    },
  },
  {
    id: "hammer_rsi_exit",
    title: "Hammer Entry, RSI Exit",
    description:
      "Enter on a hammer reversal candle, then exit when RSI crosses back down through 45 — let momentum, not a fixed percentage, decide when the move is over.",
    strategy_name: "hammer_rsi_exit",
    components: {
      setup: { type: "NONE", timeframe: "1d" },
      trigger: { type: "CANDLE_PATTERN", timeframe: "1d", pattern: "HAMMER" },
      exit: { type: "INDICATOR_CROSS", timeframe: "1d", indicator: "rsi_14", direction: "DOWN", value: 45 },
    },
  },
  {
    id: "weekly_trend_daily_entry",
    title: "Weekly Trend, Daily Entry",
    description:
      "Only trade with the bigger trend — require RSI above 50 on the weekly (5-day) chart, then enter on a daily bullish-engulfing candle and ride it with a 6% trailing stop.",
    strategy_name: "weekly_trend_daily_entry",
    components: {
      setup: {
        type: "INDICATOR_THRESHOLD",
        timeframe: "5d",
        indicator: "RSI",
        params: { period: 14 },
        operator: ">",
        value: 50,
      },
      trigger: { type: "CANDLE_PATTERN", timeframe: "1d", pattern: "BULLISH_ENGULFING" },
      exit: { type: "TRAILING_STOP_PCT", timeframe: "1d", value: 0.06 },
    },
  },
];

export function getRecipeById(id: string): BacktestRecipe | undefined {
  return BACKTEST_RECIPES.find((r) => r.id === id);
}

export function cloneRecipeComponents(recipeId: string): StrategyComponents | null {
  const r = getRecipeById(recipeId);
  return r ? componentsFrom(r.components) : null;
}

/**
 * Stamp the chosen base timeframe across blocks. The trigger and exit always run
 * on the base; a setup that is already coarser than the base keeps its own frame
 * (multi-timeframe alignment only goes coarse→fine).
 */
export function applyTimeframeToComponents(parts: StrategyComponents, timeframe: string): StrategyComponents {
  const setupTf = tfRank(parts.setup?.timeframe) > tfRank(timeframe) ? parts.setup.timeframe : timeframe;
  const out: StrategyComponents = { setup: { ...parts.setup, timeframe: setupTf } };
  if (parts.trigger) out.trigger = { ...parts.trigger, timeframe };
  if (parts.exit) out.exit = { ...parts.exit, timeframe };
  return out;
}

/** Suggested experiment slug from current blocks (fair A/B tweaks). */
export function suggestExperimentStrategyName(parts: StrategyComponents): string {
  const setup = parts.setup ?? {};
  const trigger = parts.trigger;
  const exitBlock = parts.exit ?? {};
  const setupType = String(setup.type ?? "x").toLowerCase();
  const trigType = trigger ? String(trigger.type ?? "x").toLowerCase() : "edge";
  const exitType = String(exitBlock.type ?? "x").toLowerCase();

  const seg: string[] = [];

  if (setupType === "indicator_threshold") {
    const ind = String(setup.indicator ?? "rsi").toLowerCase();
    const val = setup.value != null ? String(setup.value).replace(/\./g, "p") : "";
    seg.push(ind + val);
  } else seg.push(setupType === "none" ? "noop" : setupType.slice(0, 6));

  if (!trigger) {
    seg.push("edge");
  } else if (trigType === "candle_pattern") {
    seg.push(String(trigger.pattern ?? "pattern").toLowerCase().slice(0, 12));
  } else if (trigType === "price_crossover") {
    seg.push(`px${trigger.price_level ?? 0}_${String(trigger.direction ?? "ab").slice(0, 2)}`.toLowerCase());
  } else seg.push(trigType.slice(0, 10));

  if (exitType === "conditional_or_fixed") {
    const conds = exitBlock.conditions;
    let sl = 0;
    let tp = 0;
    if (Array.isArray(conds)) {
      for (const c of conds) {
        if (c && typeof c === "object") {
          const o = c as { type?: string; value?: number };
          if (o.type === "STOP_LOSS_PCT") sl = Math.round(Number(o.value) * 100);
          if (o.type === "TAKE_PROFIT_PCT") tp = Math.round(Number(o.value) * 100);
        }
      }
    }
    seg.push(`sl${sl}tp${tp}`);
  } else if (exitType === "take_profit_pct") {
    seg.push(`tp${Math.round(Number(exitBlock.value) * 100)}`);
  } else if (exitType === "trailing_stop_pct") {
    seg.push(`trail${Math.round(Number(exitBlock.value) * 100)}`);
  } else if (exitType === "indicator_cross") {
    seg.push(`x${String(exitBlock.indicator ?? "ind")}_${exitBlock.value ?? 0}`.toLowerCase());
  } else if (exitType === "time_based") {
    seg.push(`d${exitBlock.max_holding_days ?? 0}`);
  } else seg.push(exitType.slice(0, 8));

  return `exp_${seg.join("_").replace(/[^a-z0-9_]+/gi, "_")}`;
}
