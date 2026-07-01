import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { ArrowRight, Play, X, Loader2, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { BACKTEST_RECIPES } from "@/lib/backtestRecipes";
import {
  MAX_BATCH_CELLS,
  buildBatchCells,
  batchCellCount,
  batchStatus,
  runBatch,
  fetchTopEquityCurves,
  type BatchCell,
} from "@/lib/batchBacktest";
import { createBatchRun, updateBatchCell, finalizeBatchRun } from "@/lib/savedBatches";
import { listWatchlist } from "@/lib/watchlist";

const TIMEFRAMES = ["1d", "3d", "5d", "8d", "13d", "21d", "34d"];
const DEFAULT_TICKERS = "NVDA, AMD, MSFT";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function parseTickers(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[,\s]+/)
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
}

const cellStatusStyle: Record<BatchCell["status"], string> = {
  queued: "border-border-subtle text-fg-muted",
  running: "border-ink/40 text-ink",
  done: "border-positive/40 bg-positive/5 text-positive",
  failed: "border-negative/40 bg-negative/5 text-negative",
};

const BatchLab = () => {
  const { user, loading: authLoading } = useRequireOnboarding();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [strategyIds, setStrategyIds] = useState<string[]>(["rsi_oversold_bounce", "ema_8_13_cross"]);
  const [tickerText, setTickerText] = useState(DEFAULT_TICKERS);
  const [timeframe, setTimeframe] = useState("1d");
  const [startDate, setStartDate] = useState(isoDaysAgo(365 * 2));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [initialCapital, setInitialCapital] = useState("10000");
  const [ddCap, setDdCap] = useState(12);

  const [running, setRunning] = useState(false);
  const [cells, setCells] = useState<BatchCell[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  // Synchronous guard: `running` state can't close the check-then-act window on a
  // fast double-click, so a ref is the real duplicate-run lock.
  const runningRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Abort an in-flight batch if the user navigates away mid-run.
  useEffect(() => () => abortRef.current?.abort(), []);

  const tickers = useMemo(() => parseTickers(tickerText), [tickerText]);
  const cellCount = useMemo(() => batchCellCount({ tickers, strategyIds }), [tickers, strategyIds]);
  const overCap = cellCount > MAX_BATCH_CELLS;
  const capNum = Number(initialCapital);
  const canRun =
    !running && cellCount > 0 && !overCap && Number.isFinite(capNum) && capNum > 0 && !!startDate && !!endDate;

  const toggleStrategy = (id: string) =>
    setStrategyIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const fillFromWatchlist = useCallback(async () => {
    if (!user) return;
    try {
      const wl = await listWatchlist(user.id);
      if (!wl.length) {
        toast.info("Your watchlist is empty — add symbols from a stock page first.");
        return;
      }
      const merged = parseTickers(`${tickerText} ${wl.map((w) => w.symbol).join(" ")}`);
      setTickerText(merged.join(", "));
    } catch {
      toast.error("Could not load your watchlist.");
    }
  }, [user, tickerText]);

  const done = cells.filter((c) => c.status === "done" || c.status === "failed").length;

  const handleRun = async () => {
    if (!user || !canRun || runningRef.current) return;
    runningRef.current = true;
    const built = buildBatchCells({ tickers, strategyIds });
    const runName = name.trim() || `${tickers.length} tickers × ${strategyIds.length} strategies`;
    const config = { name: runName, tickers, strategyIds, timeframe, startDate, endDate, initialCapital: capNum, ddCap };

    setRunning(true);
    setCells(built.map((c) => ({ ...c })));
    const controller = new AbortController();
    abortRef.current = controller;

    let runId: string;
    let cellIds: Record<string, string>;
    try {
      ({ runId, cellIds } = await createBatchRun(user.id, config, built));
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg ? `Could not start the batch: ${msg}` : "Could not start the batch.");
      setRunning(false);
      runningRef.current = false;
      return;
    }

    // If a cell result can't be persisted, its DB row stays behind the in-memory
    // state — so the run must not finalize as "complete" on that in-memory view.
    let persistFailed = false;
    const onCellUpdate = async (cell: BatchCell) => {
      setCells((prev) => prev.map((c) => (c.symbol === cell.symbol && c.strategyId === cell.strategyId ? { ...cell } : c)));
      const id = cellIds[`${cell.symbol}|${cell.strategyId}`];
      if (id && (cell.status === "done" || cell.status === "failed")) {
        try {
          await updateBatchCell(id, { status: cell.status, result: cell.result, error: cell.error ?? null });
        } catch (e) {
          console.error("Failed to persist cell", e);
          persistFailed = true;
        }
      }
    };

    // One native batch call per strategy (all its symbols at once).
    await runBatch(built, config, { signal: controller.signal, onCellUpdate });

    // Native batch omits equity curves — top up the leaders so the overlay renders.
    if (!controller.signal.aborted) {
      await fetchTopEquityCurves(built, config, 8, { signal: controller.signal, onCellUpdate });
    }

    const anyDone = built.some((c) => c.status === "done");
    const rolled = batchStatus(built);
    const finalStatus = persistFailed && rolled === "complete" ? "partial" : rolled;

    try {
      await finalizeBatchRun(runId, finalStatus);
    } catch (e) {
      console.error(e);
    }
    setRunning(false);
    runningRef.current = false;

    if (controller.signal.aborted) {
      if (anyDone) {
        toast.info("Batch cancelled — completed runs were saved.");
        navigate(`/strategy-lab/batch/${runId}`);
      } else {
        toast.info("Batch cancelled.");
      }
      return;
    }

    if (anyDone) {
      toast.success("Batch complete");
      navigate(`/strategy-lab/batch/${runId}`);
    } else {
      toast.error("Every run failed. Try a shorter date range or different tickers.");
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">Loading…</div>;
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[900px] flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Batch backtest</p>
            <h1 className="mt-3 font-serif text-[38px] font-medium leading-tight text-fg-primary">Test a strategy across your list</h1>
            <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-fg-secondary">
              Run every strategy you pick against every ticker you pick, then read one clear verdict on the configuration worth deploying.
            </p>
          </div>
          <Link to="/strategy-builder" className="whitespace-nowrap font-cap text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-secondary hover:text-fg-primary">
            Single backtest →
          </Link>
        </div>

        {running ? (
          <section className="mt-10 rounded-2xl border border-border-subtle bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.14em] text-gold-deep">
                Running {done} / {cells.length}
              </p>
              <button type="button" onClick={cancel} className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
            <p className="mt-2 text-sm text-fg-secondary">
              Each strategy runs as one batch across all your tickers, then the leaders' equity curves fill in. Completed runs are saved as you go.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {cells.map((c) => (
                <div
                  key={`${c.symbol}|${c.strategyId}`}
                  className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm", cellStatusStyle[c.status])}
                >
                  <span className="truncate">
                    <span className="font-medium">{c.symbol}</span>
                    <span className="ml-1.5 text-xs opacity-70">{c.strategyId.replace(/_/g, " ")}</span>
                  </span>
                  {c.status === "running" && <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />}
                  {c.status === "done" && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  {c.status === "failed" && <X className="h-3.5 w-3.5 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="mt-10 space-y-6">
            {/* Strategies */}
            <section className="rounded-2xl border border-border-subtle bg-card p-6">
              <p className="font-cap text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Strategies</p>
              <p className="mt-1 text-sm text-fg-secondary">Pick the approaches to pit against each other.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {BACKTEST_RECIPES.map((r) => {
                  const on = strategyIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleStrategy(r.id)}
                      aria-pressed={on}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors",
                        on ? "border-ink bg-ink text-white" : "border-border-subtle text-fg-secondary hover:border-border-strong",
                      )}
                    >
                      {on && <Star className="h-3 w-3" />}
                      {r.title}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Tickers */}
            <section className="rounded-2xl border border-border-subtle bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-cap text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Tickers</p>
                  <p className="mt-1 text-sm text-fg-secondary">Type or paste symbols, separated by spaces or commas.</p>
                </div>
                <button type="button" onClick={fillFromWatchlist} className="whitespace-nowrap rounded-full border border-border-subtle px-4 py-2 text-sm text-fg-secondary hover:text-fg-primary">
                  Fill from watchlist
                </button>
              </div>
              <input
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                placeholder="NVDA, AMD, MSFT"
                className="mt-4 w-full rounded-xl border border-border-subtle bg-surface-sunken/40 px-4 py-3 font-serif text-lg text-fg-primary outline-none focus:border-ink"
              />
              {tickers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tickers.map((t) => (
                    <span key={t} className="rounded-md bg-surface-sunken px-2 py-1 font-cap text-[11px] font-semibold text-gold-deep">{t}</span>
                  ))}
                </div>
              )}
            </section>

            {/* Window + capital + cap */}
            <section className="rounded-2xl border border-border-subtle bg-card p-6">
              <p className="font-cap text-[12px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Test window</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">Start</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-sunken/40 px-3 py-2.5 text-fg-primary outline-none focus:border-ink" />
                </label>
                <label className="block">
                  <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">End</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-sunken/40 px-3 py-2.5 text-fg-primary outline-none focus:border-ink" />
                </label>
                <label className="block">
                  <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">Timeframe</span>
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-sunken/40 px-3 py-2.5 text-fg-primary outline-none focus:border-ink">
                    {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">Starting capital ($)</span>
                  <input type="number" min={1} value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-sunken/40 px-3 py-2.5 text-fg-primary outline-none focus:border-ink" />
                </label>
              </div>
              <div className="mt-5">
                <div className="flex items-baseline justify-between">
                  <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">Tolerable drawdown for the deploy pick</span>
                  <span className="font-serif text-lg text-ink">−{ddCap}%</span>
                </div>
                <input type="range" min={8} max={25} step={1} value={ddCap} onChange={(e) => setDdCap(Number(e.target.value))} className="mt-2 w-full accent-ink" aria-label="Tolerable drawdown percent" />
              </div>
            </section>

            {/* Name + run */}
            <section className="rounded-2xl border border-border-subtle bg-card p-6">
              <label className="block">
                <span className="font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">Name this batch (optional)</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Momentum sweep, June" className="mt-1.5 w-full rounded-xl border border-border-subtle bg-surface-sunken/40 px-3 py-2.5 text-fg-primary outline-none focus:border-ink" />
              </label>
              <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <p className={cn("text-sm", overCap ? "text-negative" : "text-fg-secondary")}>
                  {cellCount === 0
                    ? "Pick at least one strategy and one ticker."
                    : overCap
                      ? `${cellCount} runs — over the ${MAX_BATCH_CELLS} limit. Trim tickers or strategies.`
                      : `${cellCount} backtest${cellCount === 1 ? "" : "s"} to run.`}
                </p>
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity",
                    canRun ? "bg-ink" : "bg-ink/40",
                  )}
                >
                  <Play className="h-4 w-4" /> Run batch <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BatchLab;
