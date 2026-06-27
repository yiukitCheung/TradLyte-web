/**
 * Strategy compilation parity with the serving /backtest composition model
 * (see API_GUIDE.md). These tests pin the rules that are easy to silently break:
 *   - triggers may only be CANDLE_PATTERN / PRICE_CROSSOVER, or omitted
 *   - crossover entries live in `setup`, with the trigger omitted (setup-edge)
 *   - multi-timeframe alignment goes coarse→fine only
 */
import { describe, it, expect } from "vitest";

import {
  buildComponentsFromDraft,
  buildBacktestRequest,
  defaultStrategyDraft,
  defaultSetupCondition,
  draftFromRecipeId,
  proConfigToDraft,
  validateDraft,
  type StrategyDraft,
} from "../strategyDraft";
import { BACKTEST_RECIPES } from "../backtestRecipes";

const ALLOWED_TRIGGERS = new Set(["CANDLE_PATTERN", "PRICE_CROSSOVER"]);

describe("buildComponentsFromDraft", () => {
  it("compiles the default draft into a valid bracket strategy", () => {
    const c = buildComponentsFromDraft(defaultStrategyDraft());
    expect(c.setup).toMatchObject({ type: "NONE", timeframe: "1d" });
    expect(c.trigger).toMatchObject({ type: "CANDLE_PATTERN", pattern: "GREEN_CANDLE" });
    expect(c.exit).toMatchObject({ type: "CONDITIONAL_OR_FIXED" });
  });

  it("OMITS the trigger for a setup-edge entry", () => {
    const d = defaultStrategyDraft();
    d.trigger.mode = "none";
    const c = buildComponentsFromDraft(d);
    expect(c.trigger).toBeUndefined();
  });

  it("compiles an RSI threshold setup as INDICATOR_THRESHOLD", () => {
    const d = defaultStrategyDraft();
    d.setup.mode = "indicator";
    d.setup.kind = "rsi";
    d.setup.operator = "<";
    d.setup.threshold = 30;
    const c = buildComponentsFromDraft(d);
    expect(c.setup).toMatchObject({ type: "INDICATOR_THRESHOLD", indicator: "RSI", operator: "<", value: 30 });
  });

  it("compiles a general MACD cross condition as an EXPRESSION", () => {
    const d = defaultStrategyDraft();
    d.setup.mode = "indicator";
    d.setup.kind = "indicator";
    d.setup.condition = {
      left: { kind: "indicator", indicator: "MACD", period: 0, output: "macd", value: 0 },
      operator: "CROSS_ABOVE",
      right: { kind: "indicator", indicator: "MACD", period: 0, output: "signal", value: 0 },
    };
    d.trigger.mode = "none";
    const c = buildComponentsFromDraft(d);
    expect(c.setup.type).toBe("EXPRESSION");
    expect(c.setup.expression).toMatchObject({
      op: "CROSS_ABOVE",
      left: { indicator: "MACD", output: "macd" },
      right: { indicator: "MACD", output: "signal" },
    });
    expect(c.trigger).toBeUndefined();
  });

  it("compiles an indicator-cross exit as INDICATOR_CROSS with a resolved column", () => {
    const d = defaultStrategyDraft();
    d.exit.mode = "indicator_cross";
    d.exit.exitIndicator = "RSI";
    d.exit.exitPeriod = 14;
    d.exit.exitDirection = "DOWN";
    d.exit.exitValue = 50;
    const c = buildComponentsFromDraft(d);
    expect(c.exit).toMatchObject({ type: "INDICATOR_CROSS", indicator: "rsi_14", direction: "DOWN", value: 50 });
  });

  it("converts a 1% stop to 0.01 (no boundary truncation)", () => {
    const d = defaultStrategyDraft();
    d.exit.mode = "stop_loss";
    d.exit.stopLossPct = 1;
    const c = buildComponentsFromDraft(d);
    expect(c.exit).toMatchObject({ type: "STOP_LOSS_PCT", value: 0.01 });
  });

  it("OR-composes a stacked exit into CONDITIONAL_OR_FIXED", () => {
    const d = defaultStrategyDraft();
    d.exit.mode = "stack";
    d.exit.stack = [
      { kind: "stop_loss", pct: 5 },
      { kind: "take_profit", pct: 10 },
      { kind: "trailing", pct: 4 },
    ];
    const c = buildComponentsFromDraft(d);
    expect(c.exit?.type).toBe("CONDITIONAL_OR_FIXED");
    expect((c.exit?.conditions as unknown[]).length).toBe(3);
  });
});

describe("multi-timeframe", () => {
  it("runs a coarser setup on its own frame while trigger/exit stay on the base", () => {
    const d = defaultStrategyDraft();
    d.timeframe = "1d";
    d.setup.mode = "indicator";
    d.setup.kind = "rsi";
    d.setup.timeframe = "5d";
    d.trigger.mode = "candle_pattern";
    const c = buildComponentsFromDraft(d);
    expect(c.setup.timeframe).toBe("5d");
    expect(c.trigger?.timeframe).toBe("1d");
    expect(c.exit?.timeframe).toBe("1d");
  });

  it("rejects a setup timeframe finer than the base", () => {
    const d = defaultStrategyDraft();
    d.timeframe = "5d";
    d.setup.mode = "indicator";
    d.setup.timeframe = "1d";
    expect(validateDraft(d)).toMatch(/coarser/i);
  });
});

describe("buildBacktestRequest", () => {
  it("carries the chosen base timeframe to the top level", () => {
    const d = defaultStrategyDraft();
    d.timeframe = "8d";
    const body = buildBacktestRequest(d, {
      symbol: "msft",
      startDate: "2024-01-01",
      endDate: "2024-06-01",
      initialCapital: 10000,
    });
    expect(body.timeframe).toBe("8d");
    expect(body.symbol).toBe("MSFT");
  });
});

describe("preset recipes are API-valid", () => {
  it("never emits a removed trigger type", () => {
    for (const r of BACKTEST_RECIPES) {
      const trig = r.components.trigger;
      if (trig) expect(ALLOWED_TRIGGERS.has(String(trig.type))).toBe(true);
    }
  });

  it("expresses crossover recipes as a setup with no trigger", () => {
    const macd = BACKTEST_RECIPES.find((r) => r.id === "macd_golden_cross");
    expect(macd?.components.trigger).toBeUndefined();
    expect(macd?.components.setup.type).toBe("EXPRESSION");
  });

  it("every recipe id with a guided draft compiles cleanly", () => {
    for (const r of BACKTEST_RECIPES) {
      const draft = draftFromRecipeId(r.id);
      if (draft) expect(validateDraft(draft)).toBeNull();
    }
  });
});

describe("proConfigToDraft migration", () => {
  it("migrates a crossover trigger into a setup-edge entry", () => {
    const legacy = {
      _source: "pro",
      strategyName: "old_golden",
      timeframe: "1d",
      setup: { mode: "none" },
      trigger: { mode: "crossover", fast: { type: "EMA", period: 8 }, slow: { type: "EMA", period: 21 }, crossoverType: "GOLDEN_CROSS" },
      exit: { mode: "conditions", stopLossPct: 5, takeProfitPct: 12 },
    };
    const d: StrategyDraft = proConfigToDraft(legacy);
    expect(d.trigger.mode).toBe("none");
    expect(d.setup.kind).toBe("indicator");
    expect(d.setup.condition?.operator).toBe("CROSS_ABOVE");
    const c = buildComponentsFromDraft(d);
    expect(c.trigger).toBeUndefined();
    expect(c.setup.type).toBe("EXPRESSION");
    expect(validateDraft(d)).toBeNull();
  });

  it("keeps a candle-pattern trigger as an entry trigger", () => {
    const d = proConfigToDraft({
      setup: { mode: "indicator", indicator: "RSI", period: 14, operator: ">", value: 50 },
      trigger: { mode: "candle_pattern", pattern: "HAMMER" },
      exit: { mode: "time", maxHoldingDays: 7 },
    });
    expect(d.trigger.mode).toBe("candle_pattern");
    expect(d.exit.mode).toBe("time");
  });
});

describe("defaultSetupCondition", () => {
  it("is a valid RSI-vs-value condition", () => {
    const cond = defaultSetupCondition();
    expect(cond.left.indicator).toBe("RSI");
    expect(cond.right.kind).toBe("value");
  });
});
