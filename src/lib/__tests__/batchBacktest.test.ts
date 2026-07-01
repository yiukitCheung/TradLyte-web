/**
 * Batch backtest decision logic. These pin the contracts the analytics page
 * relies on and that are easy to silently break:
 *   - champion = highest return among cells within the drawdown cap
 *   - tightening the cap can change (or remove) the deploy pick
 *   - consistency = per-strategy Sharpe spread, strongest average first
 *   - metric projection converts fractional API values to whole-number percent
 */
import { describe, it, expect } from "vitest";
import type { BatchCell, CellMetrics } from "../batchBacktest";
import {
  buildBatchCells,
  batchCellCount,
  cellMetrics,
  pickChampion,
  strategyConsistency,
  leaderboard,
  batchStatus,
  strategyTitle,
  parseStrategyBatchResponse,
} from "../batchBacktest";

function m(partial: Partial<CellMetrics> & Pick<CellMetrics, "strategyId">): CellMetrics {
  return {
    symbol: partial.symbol ?? "AAA",
    strategyId: partial.strategyId,
    strategyTitle: strategyTitle(partial.strategyId),
    ret: partial.ret ?? null,
    sharpe: partial.sharpe ?? null,
    dd: partial.dd ?? null,
    win: partial.win ?? null,
    trades: partial.trades ?? null,
  };
}

describe("buildBatchCells", () => {
  it("forms the tickers × strategies matrix, upper-casing and de-duping symbols", () => {
    const cells = buildBatchCells({
      tickers: ["nvda", "NVDA", "amd"],
      strategyIds: ["golden_cross_20_50", "rsi_oversold_bounce"],
    });
    expect(cells).toHaveLength(4); // 2 unique symbols × 2 strategies
    expect(cells.every((c) => c.symbol === c.symbol.toUpperCase())).toBe(true);
    expect(cells.every((c) => c.status === "queued" && c.result === null)).toBe(true);
  });

  it("drops unknown strategy ids", () => {
    const cells = buildBatchCells({ tickers: ["NVDA"], strategyIds: ["golden_cross_20_50", "not_a_recipe"] });
    expect(cells).toHaveLength(1);
    expect(cells[0].strategyId).toBe("golden_cross_20_50");
  });

  it("batchCellCount matches the built length", () => {
    const params = { tickers: ["NVDA", "AMD", "MSFT"], strategyIds: ["golden_cross_20_50", "rsi_oversold_bounce"] };
    expect(batchCellCount(params)).toBe(6);
  });
});

describe("cellMetrics", () => {
  it("converts fractional API values to whole-number percent", () => {
    const cell: BatchCell = {
      symbol: "NVDA",
      strategyId: "rsi_oversold_bounce",
      status: "done",
      result: {
        total_return_pct: 0.34,
        max_drawdown_pct: 0.11,
        sharpe_ratio: 1.8,
        win_rate: 0.62,
        total_trades: 9,
      },
    };
    const cm = cellMetrics(cell);
    expect(cm.ret).toBeCloseTo(34);
    expect(cm.dd).toBeCloseTo(11);
    expect(cm.sharpe).toBe(1.8);
    expect(cm.win).toBeCloseTo(62);
    expect(cm.trades).toBe(9);
  });

  it("passes through values already expressed as percent and nulls missing metrics", () => {
    const cell: BatchCell = {
      symbol: "AMD",
      strategyId: "golden_cross_20_50",
      status: "done",
      result: { total_return_pct: 28, win_rate: 59 },
    };
    const cm = cellMetrics(cell);
    expect(cm.ret).toBeCloseTo(28);
    expect(cm.win).toBeCloseTo(59);
    expect(cm.dd).toBeNull();
    expect(cm.sharpe).toBeNull();
  });
});

describe("pickChampion", () => {
  const cells = [
    m({ symbol: "NVDA", strategyId: "rsi_oversold_bounce", ret: 34, dd: 11 }),
    m({ symbol: "AMD", strategyId: "rsi_oversold_bounce", ret: 28, dd: 14 }),
    m({ symbol: "MSFT", strategyId: "rsi_oversold_bounce", ret: 18, dd: 9 }),
  ];

  it("picks the highest return within the drawdown cap", () => {
    const champ = pickChampion(cells, 12);
    expect(champ?.symbol).toBe("NVDA"); // 34% @ −11% fits −12% cap
  });

  it("re-selects a shallower-drawdown config when the cap tightens", () => {
    const champ = pickChampion(cells, 10);
    expect(champ?.symbol).toBe("MSFT"); // NVDA (−11%) and AMD (−14%) now excluded
  });

  it("returns null when nothing fits the cap", () => {
    expect(pickChampion(cells, 8)).toBeNull();
  });

  it("ignores cells missing a return or drawdown", () => {
    const withGaps = [m({ strategyId: "x", ret: 99, dd: null }), m({ strategyId: "y", ret: null, dd: 5 })];
    expect(pickChampion(withGaps, 20)).toBeNull();
  });
});

describe("strategyConsistency", () => {
  it("computes avg/min/max Sharpe per strategy and orders by average, strongest first", () => {
    const cells = [
      m({ strategyId: "rsi_oversold_bounce", sharpe: 1.8 }),
      m({ strategyId: "rsi_oversold_bounce", sharpe: 1.2 }),
      m({ strategyId: "golden_cross_20_50", sharpe: 0.9 }),
      m({ strategyId: "golden_cross_20_50", sharpe: 0.6 }),
    ];
    const rows = strategyConsistency(cells);
    expect(rows.map((r) => r.strategyId)).toEqual(["rsi_oversold_bounce", "golden_cross_20_50"]);
    expect(rows[0].avgSharpe).toBeCloseTo(1.5);
    expect(rows[0].minSharpe).toBe(1.2);
    expect(rows[0].maxSharpe).toBe(1.8);
    expect(rows[0].count).toBe(2);
  });

  it("skips cells without a Sharpe value", () => {
    const rows = strategyConsistency([
      m({ strategyId: "golden_cross_20_50", sharpe: null }),
      m({ strategyId: "golden_cross_20_50", sharpe: 1.0 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(1);
    expect(rows[0].avgSharpe).toBe(1.0);
  });
});

describe("leaderboard", () => {
  it("ranks completed cells by return and honors the limit", () => {
    const cells = [
      m({ symbol: "A", strategyId: "x", ret: 10 }),
      m({ symbol: "B", strategyId: "x", ret: 30 }),
      m({ symbol: "C", strategyId: "x", ret: null }),
      m({ symbol: "D", strategyId: "x", ret: 20 }),
    ];
    const top2 = leaderboard(cells, 2);
    expect(top2.map((c) => c.symbol)).toEqual(["B", "D"]);
  });
});

describe("parseStrategyBatchResponse", () => {
  // Shape per API_GUIDE.md native batch mode (data.results[] + aggregate.errors[]).
  const json = {
    data: {
      results: [
        { symbol: "AAPL", total_return_pct: 0.18, total_trades: 6, win_rate: 0.67, sharpe_ratio: 1.3, max_drawdown_pct: -0.09, final_capital: 11800 },
        { symbol: "msft", total_return_pct: 0.05, total_trades: 3 },
      ],
      aggregate: { errors: [{ symbol: "ZZZZ", error: "no data" }] },
    },
  };

  it("maps per-symbol results, upper-cased, normalizing fractional metrics", () => {
    const { bySymbol } = parseStrategyBatchResponse(json);
    const aapl = bySymbol.get("AAPL");
    expect(aapl?.total_return_pct).toBeCloseTo(0.18);
    expect(aapl?.max_drawdown_pct).toBeCloseTo(0.09); // sign stripped to magnitude
    expect(aapl?.sharpe_ratio).toBe(1.3);
    expect(bySymbol.has("MSFT")).toBe(true); // "msft" upper-cased
  });

  it("collects aggregate errors into a symbol set", () => {
    expect(parseStrategyBatchResponse(json).errors.has("ZZZZ")).toBe(true);
  });

  it("tolerates missing data / null input", () => {
    expect(parseStrategyBatchResponse({}).bySymbol.size).toBe(0);
    expect(parseStrategyBatchResponse(null).errors.size).toBe(0);
  });
});

describe("batchStatus", () => {
  const cell = (status: BatchCell["status"]): BatchCell => ({
    symbol: "X",
    strategyId: "x",
    status,
    result: null,
  });

  it("rolls cell states up to a run status", () => {
    expect(batchStatus([cell("done"), cell("done")])).toBe("complete");
    expect(batchStatus([cell("done"), cell("failed")])).toBe("partial");
    expect(batchStatus([cell("failed"), cell("failed")])).toBe("failed");
  });
});
