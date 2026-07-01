/**
 * Batch backtesting — run one strategy recipe against many symbols (a matrix of
 * tickers × strategies) and derive the analytics that drive a deploy decision.
 *
 * Platform-agnostic (no DOM/React): the runner queues sequential `/backtest`
 * calls through the shared market gateway, and the pure derivations
 * (`pickChampion`, `strategyConsistency`, `leaderboard`, `cellMetrics`) are unit
 * tested. Percentages here are whole numbers for decision math (34 = +34%,
 * 11 = −11% drawdown); `BacktestResult` stores them fractional, so `cellMetrics`
 * is the single conversion point.
 */
import type { BacktestResult } from "@/lib/backtestUtils";
import { normalizeBacktestResponse } from "@/lib/backtestUtils";
import { getRecipeById, applyTimeframeToComponents } from "@/lib/backtestRecipes";

// `marketGateway` pulls in the Supabase client (which throws without env vars at
// import time). Import it lazily inside the runner so the pure derivations above
// stay import-safe under the unit-test runner.

/** Sequential API calls are ~5–30s each; keep a batch to a couple of minutes. */
export const MAX_BATCH_CELLS = 25;

export type CellStatus = "queued" | "running" | "done" | "failed";

export interface BatchCell {
  symbol: string;
  strategyId: string;
  status: CellStatus;
  result: BacktestResult | null;
  error?: string;
}

export interface BatchParams {
  tickers: string[];
  strategyIds: string[];
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
}

/** Deploy-ranking lens for the heatmap. */
export type LensMetric = "return" | "sharpe" | "drawdown";

/** Decision-ready view of one completed (or empty) cell — percentages as whole numbers. */
export interface CellMetrics {
  symbol: string;
  strategyId: string;
  strategyTitle: string;
  /** Total return, percent (34 = +34%). null when the cell has no result. */
  ret: number | null;
  sharpe: number | null;
  /** Max drawdown magnitude, percent (11 = −11%). */
  dd: number | null;
  /** Win rate, percent (0–100). */
  win: number | null;
  trades: number | null;
}

function normalizeSymbol(s: string): string {
  return s.trim().toUpperCase();
}

/** Human title for a recipe id, falling back to the id itself. */
export function strategyTitle(strategyId: string): string {
  return getRecipeById(strategyId)?.title ?? strategyId;
}

/**
 * Cartesian product of tickers × strategies → one queued cell each. Symbols are
 * upper-cased and de-duplicated; unknown strategy ids are dropped. The result is
 * NOT capped here — callers validate against {@link MAX_BATCH_CELLS} before running.
 */
export function buildBatchCells(params: Pick<BatchParams, "tickers" | "strategyIds">): BatchCell[] {
  const symbols = Array.from(new Set(params.tickers.map(normalizeSymbol).filter(Boolean)));
  const strategies = Array.from(new Set(params.strategyIds)).filter((id) => getRecipeById(id));
  const cells: BatchCell[] = [];
  for (const symbol of symbols) {
    for (const strategyId of strategies) {
      cells.push({ symbol, strategyId, status: "queued", result: null });
    }
  }
  return cells;
}

/** Total cells a params set would produce (for the pre-run ≤25 guard). */
export function batchCellCount(params: Pick<BatchParams, "tickers" | "strategyIds">): number {
  return buildBatchCells(params).length;
}

/** Fractional (0.34) → whole-number percent (34). Handles values already in percent. */
function toPct(value: number | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

/** Project a cell (result or not) into decision-ready whole-number metrics. */
export function cellMetrics(cell: BatchCell): CellMetrics {
  const r = cell.result;
  const win = r?.win_rate;
  return {
    symbol: cell.symbol,
    strategyId: cell.strategyId,
    strategyTitle: strategyTitle(cell.strategyId),
    ret: toPct(r?.total_return_pct ?? undefined),
    sharpe: r?.sharpe_ratio != null && Number.isFinite(r.sharpe_ratio) ? r.sharpe_ratio : null,
    dd: r?.max_drawdown_pct != null ? Math.abs(toPct(r.max_drawdown_pct) ?? 0) : null,
    win: win == null ? null : win >= 0 && win <= 1 ? win * 100 : win,
    trades: r?.total_trades ?? null,
  };
}

/**
 * The configuration to deploy: highest return among cells whose max drawdown
 * stays within `ddCapPct` (percent magnitude). Cells missing a return or a
 * drawdown are ineligible. Returns null when nothing fits the cap.
 */
export function pickChampion(cells: CellMetrics[], ddCapPct: number): CellMetrics | null {
  let best: CellMetrics | null = null;
  for (const c of cells) {
    if (c.ret == null || c.dd == null) continue;
    if (c.dd > ddCapPct) continue;
    if (!best || c.ret > (best.ret ?? -Infinity)) best = c;
  }
  return best;
}

export interface StrategyConsistency {
  strategyId: string;
  strategyTitle: string;
  avgSharpe: number | null;
  minSharpe: number | null;
  maxSharpe: number | null;
  /** Cells with a Sharpe value that fed the average. */
  count: number;
}

/**
 * Per-strategy Sharpe spread across the tickers it ran on — the overfit guard:
 * a high average with a tight range is a reliable edge, a high average with a
 * wide range is one lucky ticker. Ordered by average Sharpe, strongest first.
 */
export function strategyConsistency(cells: CellMetrics[]): StrategyConsistency[] {
  const byStrategy = new Map<string, number[]>();
  for (const c of cells) {
    if (c.sharpe == null) continue;
    const arr = byStrategy.get(c.strategyId) ?? [];
    arr.push(c.sharpe);
    byStrategy.set(c.strategyId, arr);
  }
  const rows: StrategyConsistency[] = [];
  for (const [strategyId, sharpes] of byStrategy) {
    const sum = sharpes.reduce((a, b) => a + b, 0);
    rows.push({
      strategyId,
      strategyTitle: strategyTitle(strategyId),
      avgSharpe: sharpes.length ? sum / sharpes.length : null,
      minSharpe: sharpes.length ? Math.min(...sharpes) : null,
      maxSharpe: sharpes.length ? Math.max(...sharpes) : null,
      count: sharpes.length,
    });
  }
  return rows.sort((a, b) => (b.avgSharpe ?? -Infinity) - (a.avgSharpe ?? -Infinity));
}

/** Completed cells ranked by return, highest first. */
export function leaderboard(cells: CellMetrics[], limit?: number): CellMetrics[] {
  const ranked = cells
    .filter((c) => c.ret != null)
    .sort((a, b) => (b.ret ?? -Infinity) - (a.ret ?? -Infinity));
  return limit != null ? ranked.slice(0, limit) : ranked;
}

// ---------------------------------------------------------------------------
// Runner — one native /backtest batch call per strategy (all its symbols at
// once), resumable and partial-tolerant. Native batch omits equity curves, so
// `fetchTopEquityCurves` tops up the leaders with single-symbol calls.
// ---------------------------------------------------------------------------

/** Build the single-symbol `/backtest` body for one cell (used for the equity top-up). */
function buildCellRequest(cell: BatchCell, params: BatchParams) {
  const recipe = getRecipeById(cell.strategyId);
  if (!recipe) throw new Error(`Unknown strategy: ${cell.strategyId}`);
  const tf = params.timeframe || "1d";
  return {
    strategy_name: recipe.strategy_name,
    symbol: normalizeSymbol(cell.symbol),
    timeframe: tf,
    start_date: params.startDate,
    end_date: params.endDate,
    initial_capital: params.initialCapital,
    components: applyTimeframeToComponents(recipe.components, tf),
  };
}

/** Run a single cell. Throws on gateway/engine failure so the caller can mark it failed. */
export async function runBatchCell(
  cell: BatchCell,
  params: BatchParams,
  signal?: AbortSignal,
): Promise<BacktestResult | null> {
  const body = buildCellRequest(cell, params);
  const { marketGatewayFetch } = await import("@/lib/marketGateway");
  const res = await marketGatewayFetch("/backtest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json()) as { data?: unknown; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Backtest failed (${res.status})`);
  }
  return normalizeBacktestResponse(json.data, body.strategy_name);
}

/** Build the native batch `/backtest` body: one strategy across many symbols. */
function buildStrategyBatchRequest(strategyId: string, symbols: string[], params: BatchParams) {
  const recipe = getRecipeById(strategyId);
  if (!recipe) throw new Error(`Unknown strategy: ${strategyId}`);
  const tf = params.timeframe || "1d";
  return {
    strategy_name: recipe.strategy_name,
    symbols: Array.from(new Set(symbols.map(normalizeSymbol))),
    timeframe: tf,
    start_date: params.startDate,
    end_date: params.endDate,
    initial_capital: params.initialCapital,
    components: applyTimeframeToComponents(recipe.components, tf),
  };
}

/**
 * Parse a native batch response (`data.results[]` + `data.aggregate.errors[]`)
 * into per-symbol results and the set of symbols the engine couldn't run.
 * Symbols are keyed upper-cased. Each result item is the same metrics shape as a
 * single backtest (minus `equity_curve`), so it normalizes the same way.
 */
export function parseStrategyBatchResponse(json: unknown): {
  bySymbol: Map<string, BacktestResult | null>;
  errors: Set<string>;
} {
  const bySymbol = new Map<string, BacktestResult | null>();
  const errors = new Set<string>();
  const data = (json as { data?: { results?: unknown; aggregate?: unknown } })?.data;
  const results = Array.isArray(data?.results) ? (data!.results as unknown[]) : [];
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const sym = String((item as { symbol?: unknown }).symbol ?? "").toUpperCase();
    if (!sym) continue;
    bySymbol.set(sym, normalizeBacktestResponse(item));
  }
  const agg = data?.aggregate as { errors?: unknown } | undefined;
  const errArr = Array.isArray(agg?.errors) ? (agg!.errors as unknown[]) : [];
  for (const e of errArr) {
    const sym = String((e as { symbol?: unknown })?.symbol ?? "").toUpperCase();
    if (sym) errors.add(sym);
  }
  return { bySymbol, errors };
}

export interface RunBatchHooks {
  /** Fired after every status transition so the UI can re-render live. */
  onCellUpdate?: (cell: BatchCell, index: number) => void | Promise<void>;
  signal?: AbortSignal;
}

/**
 * Run the matrix one strategy at a time — a single native batch `/backtest` call
 * per strategy across all its symbols. Per-symbol errors (from
 * `aggregate.errors`) mark just that cell failed; a whole call failing marks its
 * strategy's cells failed and the run continues. Mutates cells in place. Aborts
 * cleanly between strategies (and mid-call — the signal is threaded into fetch).
 */
export async function runBatch(
  cells: BatchCell[],
  params: BatchParams,
  hooks: RunBatchHooks = {},
): Promise<BatchCell[]> {
  const { marketGatewayFetch } = await import("@/lib/marketGateway");

  const byStrategy = new Map<string, BatchCell[]>();
  for (const c of cells) {
    const group = byStrategy.get(c.strategyId);
    if (group) group.push(c);
    else byStrategy.set(c.strategyId, [c]);
  }

  for (const [strategyId, group] of byStrategy) {
    if (hooks.signal?.aborted) break;
    const pending = group.filter((c) => c.status !== "done");
    if (!pending.length) continue;

    for (const c of pending) {
      c.status = "running";
      c.error = undefined;
      await hooks.onCellUpdate?.(c, cells.indexOf(c));
    }

    try {
      const body = buildStrategyBatchRequest(strategyId, pending.map((c) => c.symbol), params);
      const res = await marketGatewayFetch("/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: hooks.signal,
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok || json.error) throw new Error(json.error?.message ?? `Backtest failed (${res.status})`);

      const parsed = parseStrategyBatchResponse(json);
      for (const c of pending) {
        const key = c.symbol.toUpperCase();
        const result = parsed.bySymbol.get(key) ?? null;
        if (!result || parsed.errors.has(key)) {
          c.result = null;
          c.status = "failed";
          c.error = "No data for this symbol";
        } else {
          c.result = result;
          c.status = "done";
        }
        await hooks.onCellUpdate?.(c, cells.indexOf(c));
      }
    } catch (err) {
      if (hooks.signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        for (const c of pending) c.status = "queued";
        break;
      }
      const msg = err instanceof Error ? err.message : "Backtest failed";
      for (const c of pending) {
        c.result = null;
        c.status = "failed";
        c.error = msg;
        await hooks.onCellUpdate?.(c, cells.indexOf(c));
      }
    }
  }
  return cells;
}

/**
 * Native batch omits equity curves. Re-run the top-N cells by return as
 * single-symbol backtests (which do return `equity_curve`) and merge the fuller
 * result back in, so the equity-overlay chart has the leaders' curves. Bounded
 * and best-effort — a failed top-up just omits that one curve.
 */
export async function fetchTopEquityCurves(
  cells: BatchCell[],
  params: BatchParams,
  topN: number,
  hooks: RunBatchHooks = {},
): Promise<BatchCell[]> {
  const ranked = cells
    .filter((c) => c.status === "done" && c.result != null && !(c.result.equity_curve && c.result.equity_curve.length))
    .sort((a, b) => (b.result?.total_return_pct ?? -Infinity) - (a.result?.total_return_pct ?? -Infinity))
    .slice(0, topN);

  for (const c of ranked) {
    if (hooks.signal?.aborted) break;
    try {
      const full = await runBatchCell(c, params, hooks.signal);
      if (full) {
        c.result = full;
        await hooks.onCellUpdate?.(c, cells.indexOf(c));
      }
    } catch {
      // Best-effort: the overlay simply omits this curve.
    }
  }
  return cells;
}

/** Roll the finished cells up to a run status. */
export function batchStatus(cells: BatchCell[]): "complete" | "partial" | "failed" {
  const done = cells.filter((c) => c.status === "done").length;
  if (done === cells.length) return "complete";
  if (done === 0) return "failed";
  return "partial";
}
