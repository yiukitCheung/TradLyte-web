/** Shapes match serving `/backtest` `components`: setup, trigger, exit. */

export type ComponentBlock = Record<string, unknown>;

export interface StrategyComponents {
  setup: ComponentBlock;
  trigger: ComponentBlock;
  exit: ComponentBlock;
}

export interface BacktestRecipe {
  id: string;
  title: string;
  description: string;
  strategy_name: string;
  components: StrategyComponents;
}

function componentsFrom(recipe: StrategyComponents): StrategyComponents {
  return {
    setup: { ...recipe.setup },
    trigger: { ...recipe.trigger },
    exit: structuredCloneStructuredExit(recipe.exit),
  };
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
 * Beginner-friendly preset strategies, each validated against the live `/backtest`
 * endpoint. Plain-language titles + one-line "what it does" descriptions.
 */
export const BACKTEST_RECIPES: BacktestRecipe[] = [
  {
    id: "golden_cross_20_50",
    title: "The Golden Cross",
    description:
      "The classic trend signal — when the 20-day average rises above the 50-day, the trend has turned up. Buy the next green day, protect it with a 5% stop loss.",
    strategy_name: "golden_cross_20_50",
    components: {
      setup: {
        type: "EXPRESSION",
        timeframe: "1d",
        expression: {
          op: "GT",
          left: { indicator: "SMA", params: { period: 20 } },
          right: { indicator: "SMA", params: { period: 50 } },
        },
      },
      trigger: { type: "CANDLE_PATTERN", timeframe: "1d", pattern: "GREEN_CANDLE" },
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
      "Momentum turning up — buy when the MACD line crosses above its signal line. Exits on a 5% stop or a 12% profit target.",
    strategy_name: "macd_golden_cross",
    components: {
      setup: { type: "NONE", timeframe: "1d" },
      trigger: {
        type: "EXPRESSION",
        timeframe: "1d",
        signal_value: "BUY",
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
      "An advanced, faster trend trigger — buy the moment the 8-day EMA crosses above the 13-day. Exits on a 4% stop or a 15% target.",
    strategy_name: "ema_8_13_cross",
    components: {
      setup: { type: "NONE", timeframe: "1d" },
      trigger: {
        type: "EXPRESSION",
        timeframe: "1d",
        signal_value: "BUY",
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
];

export function getRecipeById(id: string): BacktestRecipe | undefined {
  return BACKTEST_RECIPES.find((r) => r.id === id);
}

export function cloneRecipeComponents(recipeId: string): StrategyComponents | null {
  const r = getRecipeById(recipeId);
  return r ? componentsFrom(r.components) : null;
}

export function applyTimeframeToComponents(parts: StrategyComponents, timeframe: string): StrategyComponents {
  return {
    setup: { ...parts.setup, timeframe },
    trigger: { ...parts.trigger, timeframe },
    exit: { ...parts.exit, timeframe },
  };
}

/** Suggested experiment slug from current blocks (fair A/B tweaks). */
export function suggestExperimentStrategyName(parts: StrategyComponents): string {
  const setup = parts.setup ?? {};
  const trigger = parts.trigger ?? {};
  const exitBlock = parts.exit ?? {};
  const setupType = String(setup.type ?? "x").toLowerCase();
  const trigType = String(trigger.type ?? "x").toLowerCase();
  const exitType = String(exitBlock.type ?? "x").toLowerCase();

  const seg: string[] = [];

  if (setupType === "indicator_threshold") {
    const ind = String(setup.indicator ?? "rsi").toLowerCase();
    const val = setup.value != null ? String(setup.value).replace(/\./g, "p") : "";
    seg.push(ind + val);
  } else seg.push(setupType === "none" ? "noop" : setupType.slice(0, 6));

  if (trigType === "candle_pattern") {
    seg.push(String(trigger.pattern ?? "pattern").toLowerCase().slice(0, 12));
  } else if (trigType === "indicator_crossover") {
    seg.push(
      `${String(trigger.indicator1 ?? "a").slice(0, 4)}_${String(trigger.indicator2 ?? "b").slice(0, 4)}_${
        String(trigger.crossover_type ?? "gc").toLowerCase() === "golden_cross" ? "gc" : "xc"
      }`,
    );
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
  } else if (exitType === "time_based") {
    seg.push(`d${exitBlock.max_holding_days ?? 0}`);
  } else seg.push(exitType.slice(0, 8));

  return `exp_${seg.join("_").replace(/[^a-z0-9_]+/gi, "_")}`;
}
