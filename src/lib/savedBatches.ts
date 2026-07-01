/**
 * Persistence for batch backtests (batch_runs + batch_run_cells). Mirrors the
 * savedStrategies pattern. Cells are written up-front as `queued` and patched to
 * `done`/`failed` as the runner completes each one, so a mid-batch interruption
 * never loses finished work and a saved run is a revisitable analytics artifact.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BacktestResult } from "@/lib/backtestUtils";
import type { BatchCell, CellStatus } from "@/lib/batchBacktest";

// `batch_runs` / `batch_run_cells` are not yet in the generated Supabase types
// (types.ts is generated — do not hand-edit). Access them through a loosely
// typed handle until the types are regenerated from the migration.
type LooseQuery = {
  insert: (v: unknown) => LooseQuery;
  update: (v: unknown) => LooseQuery;
  delete: () => LooseQuery;
  select: (cols?: string) => LooseQuery;
  eq: (col: string, val: unknown) => LooseQuery;
  order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: Record<string, unknown>; error: unknown }>;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
} & Promise<{ data: unknown; error: unknown }>;
const sb = supabase as unknown as { from: (table: string) => LooseQuery };

export type BatchRunStatus = "running" | "complete" | "partial" | "failed";

export interface BatchRunConfig {
  name: string;
  tickers: string[];
  strategyIds: string[];
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  ddCap: number;
}

export interface SavedBatchCell {
  id: string;
  symbol: string;
  strategyId: string;
  status: CellStatus;
  result: BacktestResult | null;
  error: string | null;
}

export interface SavedBatchRun extends BatchRunConfig {
  id: string;
  status: BatchRunStatus;
  createdAt: string | null;
}

export interface SavedBatchRunDetail extends SavedBatchRun {
  cells: SavedBatchCell[];
}

/** Create the run row and its queued cells; returns the run id and the cell ids
 * keyed by `symbol|strategyId` so the runner can patch each in place. */
export async function createBatchRun(
  userId: string,
  config: BatchRunConfig,
  cells: BatchCell[],
): Promise<{ runId: string; cellIds: Record<string, string> }> {
  const { data: run, error: runErr } = await sb
    .from("batch_runs")
    .insert({
      user_id: userId,
      name: config.name,
      tickers: config.tickers,
      strategy_ids: config.strategyIds,
      timeframe: config.timeframe,
      start_date: config.startDate,
      end_date: config.endDate,
      initial_capital: config.initialCapital,
      dd_cap: config.ddCap,
      status: "running",
    })
    .select("id")
    .single();
  if (runErr) throw runErr;

  const runId = run.id as string;
  const rows = cells.map((c) => ({
    batch_run_id: runId,
    user_id: userId,
    symbol: c.symbol,
    strategy_id: c.strategyId,
    status: "queued",
  }));
  const { data: inserted, error: cellErr } = await sb
    .from("batch_run_cells")
    .insert(rows)
    .select("id, symbol, strategy_id");
  if (cellErr) throw cellErr;

  const cellIds: Record<string, string> = {};
  for (const r of inserted as Array<{ id: string; symbol: string; strategy_id: string }>) {
    cellIds[`${r.symbol}|${r.strategy_id}`] = r.id;
  }
  return { runId, cellIds };
}

/** Patch one cell as the runner transitions it. */
export async function updateBatchCell(
  cellId: string,
  patch: { status: CellStatus; result?: BacktestResult | null; error?: string | null },
): Promise<void> {
  const { error } = await sb
    .from("batch_run_cells")
    .update({
      status: patch.status,
      result: (patch.result ?? null) as unknown,
      error: patch.error ?? null,
    })
    .eq("id", cellId);
  if (error) throw error;
}

export async function finalizeBatchRun(runId: string, status: BatchRunStatus): Promise<void> {
  const { error } = await sb.from("batch_runs").update({ status }).eq("id", runId);
  if (error) throw error;
}

/** Update the deploy-ranking drawdown cap for a saved run. */
export async function updateBatchDdCap(runId: string, ddCap: number): Promise<void> {
  const { error } = await sb.from("batch_runs").update({ dd_cap: ddCap }).eq("id", runId);
  if (error) throw error;
}

function mapRun(r: Record<string, unknown>): SavedBatchRun {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    tickers: (r.tickers as string[] | null) ?? [],
    strategyIds: (r.strategy_ids as string[] | null) ?? [],
    timeframe: String(r.timeframe ?? "1d"),
    startDate: String(r.start_date ?? ""),
    endDate: String(r.end_date ?? ""),
    initialCapital: Number(r.initial_capital),
    ddCap: Number(r.dd_cap),
    status: (r.status as BatchRunStatus) ?? "running",
    createdAt: (r.created_at as string | null) ?? null,
  };
}

export async function listBatchRuns(userId: string): Promise<SavedBatchRun[]> {
  const { data, error } = await sb
    .from("batch_runs")
    .select("id, name, tickers, strategy_ids, timeframe, start_date, end_date, initial_capital, dd_cap, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as Record<string, unknown>[]) ?? []).map(mapRun);
}

export async function getBatchRun(runId: string): Promise<SavedBatchRunDetail | null> {
  const { data: run, error: runErr } = await sb
    .from("batch_runs")
    .select("id, name, tickers, strategy_ids, timeframe, start_date, end_date, initial_capital, dd_cap, status, created_at")
    .eq("id", runId)
    .maybeSingle();
  if (runErr) throw runErr;
  if (!run) return null;

  const { data: cells, error: cellErr } = await sb
    .from("batch_run_cells")
    .select("id, symbol, strategy_id, status, result, error")
    .eq("batch_run_id", runId);
  if (cellErr) throw cellErr;

  return {
    ...mapRun(run),
    cells: ((cells as Record<string, unknown>[]) ?? []).map((c) => ({
      id: String(c.id),
      symbol: String(c.symbol),
      strategyId: String(c.strategy_id),
      status: c.status as CellStatus,
      result: (c.result ?? null) as BacktestResult | null,
      error: (c.error as string | null) ?? null,
    })),
  };
}

export async function deleteBatchRun(runId: string): Promise<void> {
  const { error } = await sb.from("batch_runs").delete().eq("id", runId);
  if (error) throw error;
}
