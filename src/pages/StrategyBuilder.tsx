import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowRight, Check, Play, RotateCcw, Activity, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { marketGatewayFetch } from "@/lib/marketGateway";
import {
  normalizeBacktestResponse,
  formatReturnPct,
  formatDrawdownPct,
  formatWinRate,
  buildEquityChartData,
  tradesToLogRows,
  type BacktestResult,
} from "@/lib/backtestUtils";
import {
  defaultStrategyDraft,
  draftFromRecipeId,
  buildBacktestRequest,
  validateDraft,
  type StrategyDraft,
  type BacktestRequestBody,
} from "@/lib/strategyDraft";
import {
  BACKTEST_RECIPES,
  getRecipeById,
  applyTimeframeToComponents,
  type BacktestRecipe,
} from "@/lib/backtestRecipes";
import {
  GuidedSetupStep,
  GuidedTriggerStep,
  GuidedExitStep,
} from "@/components/strategy-builder/GuidedStrategyFlow";

const STEPS = ["Lens", "Entry", "Exit", "Results"];

function ymdDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - Math.max(0, Math.floor(daysAgo)));
  return d.toISOString().slice(0, 10);
}

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface-primary px-4 py-3.5 text-[15px] text-fg-primary outline-none transition-colors focus:border-gold";

const StrategyBuilder = () => {
  const { user, loading } = useRequireOnboarding();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<StrategyDraft>(() => defaultStrategyDraft());
  // When a preset recipe is loaded, the backtest runs from its exact component
  // definition (so MACD / crossovers work); cleared the moment the user edits a rule.
  const [activeRecipe, setActiveRecipe] = useState<BacktestRecipe | null>(null);
  const [backtestSymbol, setBacktestSymbol] = useState("AAPL");
  const [initialCapital, setInitialCapital] = useState("10000");
  const [backtestStart, setBacktestStart] = useState(() => ymdDaysAgo(180));
  const [backtestEnd, setBacktestEnd] = useState(() => ymdDaysAgo(0));
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const perfData = useMemo(
    () =>
      buildEquityChartData(backtestResult?.equity_curve ?? [], {
        dates: backtestResult?.equity_curve_dates,
        startDate: backtestStart,
        endDate: backtestEnd,
      }),
    [backtestResult, backtestStart, backtestEnd],
  );

  const returnPct = backtestResult?.total_return_pct;
  const tiles = [
    {
      label: "Total return",
      value: formatReturnPct(returnPct),
      sub:
        backtestResult?.initial_capital != null && backtestResult?.final_capital != null
          ? `$${Math.round(backtestResult.initial_capital).toLocaleString()} → $${Math.round(backtestResult.final_capital).toLocaleString()}`
          : "Strategy period",
      color: returnPct != null && returnPct < 0 ? "text-negative" : "text-positive",
    },
    { label: "Sharpe ratio", value: backtestResult?.sharpe_ratio?.toFixed(2) ?? "—", sub: "Risk-adjusted", color: "text-fg-primary" },
    {
      label: "Max drawdown",
      value: formatDrawdownPct(backtestResult?.max_drawdown_pct),
      sub: "Peak-to-trough",
      color: "text-negative",
    },
    {
      label: "Win rate",
      value: formatWinRate(backtestResult?.win_rate),
      sub: backtestResult?.winning_trades != null ? `${backtestResult.winning_trades} of ${backtestResult.total_trades ?? "—"} wins` : "—",
      color: "text-fg-primary",
    },
    { label: "Trades", value: backtestResult?.total_trades?.toString() ?? "—", sub: "In range", color: "text-fg-primary" },
    {
      label: "Final capital",
      value: backtestResult?.final_capital != null ? `$${backtestResult.final_capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
      sub: `From $${Number(initialCapital).toLocaleString()}`,
      color:
        backtestResult?.final_capital != null && backtestResult.final_capital >= Number(initialCapital)
          ? "text-positive"
          : "text-negative",
    },
  ];
  const trades = tradesToLogRows(backtestResult?.trades);
  const previewTrades = trades.slice(0, 10);

  // Editing any rule means the user is customising — drop the preset so runs use the draft.
  const patchSetup = (patch: Partial<StrategyDraft["setup"]>) => {
    setActiveRecipe(null);
    setDraft((d) => ({ ...d, setup: { ...d.setup, ...patch } }));
  };
  const patchTrigger = (patch: Partial<StrategyDraft["trigger"]>) => {
    setActiveRecipe(null);
    setDraft((d) => ({ ...d, trigger: { ...d.trigger, ...patch } }));
  };
  const patchExit = (patch: Partial<StrategyDraft["exit"]>) => {
    setActiveRecipe(null);
    setDraft((d) => ({ ...d, exit: { ...d.exit, ...patch } }));
  };

  const applyRecipe = async (recipeId: string) => {
    const recipe = getRecipeById(recipeId);
    if (!recipe) {
      toast.error("Recipe not found");
      return;
    }
    // Load an editable guided draft when the recipe maps to one; the run still uses
    // the recipe's exact components (the guided model can't express e.g. MACD).
    setDraft(draftFromRecipeId(recipeId) ?? defaultStrategyDraft());
    setActiveRecipe(recipe);
    setStep(4);
    setBacktestResult(null);
    toast.message(`Running ${recipe.title}…`);
    await runBacktest(undefined, recipe);
  };

  const applyDatePreset = (preset: string) => {
    const end = ymdDaysAgo(0);
    if (preset === "YTD") {
      setBacktestStart(`${new Date().getFullYear()}-01-01`);
    } else {
      const map: Record<string, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };
      setBacktestStart(ymdDaysAgo(map[preset] ?? 180));
    }
    setBacktestEnd(end);
  };

  const resetAll = () => {
    setDraft(defaultStrategyDraft());
    setActiveRecipe(null);
    setStep(1);
    setBacktestResult(null);
    toast.info("Strategy reset");
  };

  const runBacktest = async (draftOverride?: StrategyDraft, recipeOverride?: BacktestRecipe) => {
    const cap = Number(initialCapital);
    if (!Number.isFinite(cap) || cap <= 0) {
      toast.error("Enter a valid starting capital");
      return;
    }

    // A loaded preset runs from its exact components; a custom build runs from the draft.
    const recipe = recipeOverride ?? activeRecipe;
    let body: BacktestRequestBody;
    if (recipe) {
      body = {
        strategy_name: recipe.strategy_name,
        symbol: backtestSymbol.trim().toUpperCase(),
        timeframe: "1d",
        start_date: backtestStart,
        end_date: backtestEnd,
        initial_capital: cap,
        components: applyTimeframeToComponents(recipe.components, "1d"),
      };
    } else {
      const activeDraft = draftOverride ?? draft;
      const err = validateDraft(activeDraft);
      if (err) {
        toast.error(err);
        return;
      }
      body = buildBacktestRequest(activeDraft, {
        symbol: backtestSymbol,
        startDate: backtestStart,
        endDate: backtestEnd,
        initialCapital: cap,
      });
    }

    setIsBacktesting(true);
    setBacktestResult(null);
    try {
      const res = await marketGatewayFetch("/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { data?: unknown; error?: { message?: string } };
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? `Backtest failed (${res.status})`);
        return;
      }
      const normalized = normalizeBacktestResponse(json.data, body.strategy_name);
      setBacktestResult(normalized);
      toast.success("Backtest complete");
    } catch (e) {
      console.error(e);
      toast.error("Could not run backtest");
    } finally {
      setIsBacktesting(false);
    }
  };

  useEffect(() => {
    if (step === 4) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">Loading…</div>;
  }
  if (!user) return null;

  const setupValid =
    draft.setup.mode === "none" ||
    (draft.setup.mode === "indicator" &&
      (draft.setup.kind === "rsi"
        ? draft.setup.period >= 2
        : draft.setup.fastPeriod >= 2 &&
          draft.setup.slowPeriod >= 2 &&
          draft.setup.fastPeriod < draft.setup.slowPeriod));
  const exitValid = draft.exit.mode !== "bracket" || (draft.exit.takeProfitPct > 0 && draft.exit.stopLossPct > 0);

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1">
        {/* Hero */}
        <section className="px-6 pb-16 pt-20 md:px-12 md:pt-28">
          <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">Strategy lab</p>
          <h1 className="mt-5 max-w-[720px] font-serif text-[42px] font-medium leading-[1.08] text-fg-primary md:text-[52px]">
            See how your idea would have played out.
          </h1>
          <p className="mt-6 max-w-[560px] text-[18px] leading-relaxed text-fg-secondary">
            Three simple choices — how you read the market, when you buy, and when you sell. Then replay it against real history.
          </p>
        </section>

        {/* Progress */}
        <section className="px-6 pb-12 md:px-12">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {STEPS.map((label, i) => {
              const idx = i + 1;
              const active = idx === step;
              const done = idx < step;
              return (
                <div key={label} className="flex items-center gap-2 md:gap-4">
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-full py-2.5 pl-3 pr-5 transition-all duration-300",
                      active && "bg-ink shadow-md",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full font-cap text-xs font-semibold transition-colors",
                        active ? "bg-white text-ink" : done ? "bg-gold text-white" : "bg-surface-sunken text-fg-muted",
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : idx}
                    </span>
                    <span className={cn("hidden font-cap text-sm font-medium sm:inline", active ? "text-white" : "text-fg-primary")}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="relative h-px w-6 overflow-hidden bg-border-strong md:w-12">
                      <div
                        className={cn(
                          "absolute inset-0 origin-left bg-gold transition-transform duration-500 ease-out",
                          done ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recipes — only on step 1 */}
        {step === 1 && (
          <section className="animate-fade-in px-6 pb-20 md:px-12">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-serif text-2xl font-medium text-fg-primary md:text-3xl">Or start from a recipe</h2>
              <p className="mt-3 text-[16px] text-fg-secondary">
                One click loads the strategy and runs a backtest — tweak symbol or dates on the results page.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
              {BACKTEST_RECIPES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void applyRecipe(r.id)}
                  disabled={isBacktesting}
                  className="group flex flex-col gap-5 rounded-3xl border border-border-subtle bg-card p-8 text-left transition-all duration-300 hover:border-gold/40 hover:shadow-sm disabled:opacity-60"
                >
                  <Activity className="h-5 w-5 text-gold-deep transition-transform duration-300 group-hover:scale-110" />
                  <div>
                    <h3 className="font-serif text-xl font-medium text-fg-primary">{r.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-fg-secondary">{r.description}</p>
                  </div>
                  <span className="flex items-center gap-2 font-cap text-sm font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100">
                    {isBacktesting ? "Running…" : "Run backtest"} <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Guided steps 1–3 */}
        {step === 1 && (
          <section className="animate-fade-in px-6 pb-24 md:px-12">
            <GuidedSetupStep
              draft={draft}
              patchSetup={patchSetup}
              onContinue={() => setStep(2)}
              canContinue={setupValid}
            />
          </section>
        )}
        {step === 2 && (
          <section className="animate-fade-in px-6 pb-24 md:px-12">
            <GuidedTriggerStep
              draft={draft}
              patchTrigger={patchTrigger}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
            />
          </section>
        )}
        {step === 3 && (
          <section className="animate-fade-in px-6 pb-24 md:px-12">
            <GuidedExitStep
              draft={draft}
              patchExit={patchExit}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
              canContinue={exitValid}
            />
          </section>
        )}

        {/* Step 4 — backtest + results */}
        {step === 4 && (
          <section ref={resultsRef} className="animate-fade-in px-6 pb-32 md:px-12">
            <div className="mx-auto flex max-w-3xl flex-col gap-6 text-center">
              <p className="font-cap text-xs uppercase tracking-[0.2em] text-gold-deep">Step 4 · Your results</p>
              <h2 className="font-serif text-3xl font-medium text-fg-primary md:text-4xl">
                Replay your strategy on real market history
              </h2>
              <p className="text-[17px] leading-relaxed text-fg-secondary">
                Pick a stock and a time window. We&apos;ll simulate every trade your rules would have taken.
              </p>
              {activeRecipe && (
                <div className="mx-auto flex flex-col items-center gap-1.5">
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 font-cap text-[13px] font-semibold text-gold-deep">
                    <Activity className="h-3.5 w-3.5" /> {activeRecipe.title}
                  </span>
                  <span className="font-cap text-xs text-fg-muted">Preset strategy · edit any rule to make it your own</span>
                </div>
              )}
            </div>

            <div className="mx-auto mt-16 flex max-w-2xl flex-col gap-10 rounded-3xl border border-border-subtle bg-card p-10 md:p-12">
              <div className="flex flex-col gap-8">
                <label className="flex flex-col gap-3">
                  <span className="font-serif text-xl text-fg-primary">Which stock?</span>
                  <input
                    value={backtestSymbol}
                    onChange={(e) => setBacktestSymbol(e.target.value.toUpperCase())}
                    className={inputCls}
                    placeholder="AAPL"
                  />
                </label>
                <label className="flex flex-col gap-3">
                  <span className="font-serif text-xl text-fg-primary">Starting capital</span>
                  <input value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className={inputCls} />
                </label>
                <div className="flex flex-col gap-3">
                  <span className="font-serif text-xl text-fg-primary">Time period</span>
                  <div className="flex flex-wrap gap-3">
                    {["1M", "3M", "6M", "1Y", "YTD"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => applyDatePreset(d)}
                        className="rounded-full border border-border-strong px-5 py-2.5 font-cap text-sm font-medium text-fg-secondary transition-colors hover:border-gold hover:text-fg-primary"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <input type="date" value={backtestStart} onChange={(e) => setBacktestStart(e.target.value)} className={inputCls} />
                    <input type="date" value={backtestEnd} onChange={(e) => setBacktestEnd(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 pt-4">
                <button
                  type="button"
                  onClick={() => void runBacktest()}
                  disabled={isBacktesting}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-ink px-10 py-5 text-lg font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 md:w-auto"
                >
                  {isBacktesting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Running backtest…
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" /> Run backtest
                    </>
                  )}
                </button>
                <div className="flex gap-6">
                  <button type="button" onClick={() => setStep(3)} className="font-cap text-sm text-fg-muted hover:text-fg-primary">
                    ← Edit strategy
                  </button>
                  <button type="button" onClick={resetAll} className="flex items-center gap-2 font-cap text-sm text-fg-muted hover:text-fg-primary">
                    <RotateCcw className="h-3.5 w-3.5" /> Start over
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="mx-auto mt-20 flex max-w-4xl flex-col gap-8">
              <div className="rounded-3xl border border-border-subtle bg-card p-10 md:p-12">
                <h3 className="font-serif text-2xl font-medium text-fg-primary">Equity curve</h3>
                <p className="mt-2 text-[15px] text-fg-muted">
                  {backtestResult ? `${backtestStart} – ${backtestEnd}` : "Results appear after you run a backtest"}
                </p>
                <div className="mt-10 h-[300px] w-full">
                  {perfData.length === 0 ? (
                    <div
                      className={cn(
                        "flex h-full items-center justify-center rounded-2xl bg-surface-sunken/50 font-cap text-sm text-fg-muted",
                        isBacktesting && "animate-pulse",
                      )}
                    >
                      {isBacktesting ? "Replaying every trade against history…" : "Your equity curve will show here"}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={perfData}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--fg-muted))", fontSize: 11 }} />
                        <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px" }}
                          formatter={(v: number) => [`$${Math.round(v).toLocaleString()}`, "Equity"]}
                          labelFormatter={(l) => String(l)}
                        />
                        <Line type="monotone" dataKey="strategy" stroke="hsl(var(--accent-deep))" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div key={backtestResult ? "results" : "empty"} className="grid grid-cols-2 gap-5 md:grid-cols-3">
                {tiles.map((t, i) => (
                  <div
                    key={t.label}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className="stagger-fade flex flex-col gap-3 rounded-2xl border border-border-subtle bg-card px-6 py-7"
                  >
                    <span className="font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{t.label}</span>
                    <span className={cn("font-serif text-3xl font-medium", t.color)}>{t.value}</span>
                    <span className="text-xs text-fg-muted">{t.sub}</span>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-3xl border border-border-subtle bg-card">
                <div className="flex items-center justify-between px-8 py-7">
                  <h3 className="font-serif text-xl font-medium text-fg-primary">Trade log</h3>
                  <span className="text-[14px] text-fg-muted">
                    {backtestResult?.total_trades
                      ? `${previewTrades.length} of ${backtestResult.total_trades} trades`
                      : "No trades yet"}
                  </span>
                </div>
                {previewTrades.length === 0 ? (
                  <p className="px-8 pb-10 font-cap text-sm text-fg-muted">Trades from your backtest will appear here.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-[minmax(88px,1fr)_minmax(88px,1fr)_72px_72px_64px_72px_minmax(80px,1fr)] gap-2 bg-surface-sunken px-8 font-cap text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                      {["Buy date", "Sell date", "Entry", "Exit", "P/L $", "P/L %", "Exit reason"].map((h, i) => (
                        <span key={h} className={cn("py-4", i >= 4 && i <= 5 && "text-right", i === 6 && "text-right")}>{h}</span>
                      ))}
                    </div>
                    {previewTrades.map((t, i) => (
                      <div
                        key={`${t.entryDate}-${t.exitDate}-${i}`}
                        style={{ animationDelay: `${300 + i * 50}ms` }}
                        className="stagger-fade grid grid-cols-[minmax(88px,1fr)_minmax(88px,1fr)_72px_72px_64px_72px_minmax(80px,1fr)] items-center gap-2 border-t border-border-subtle px-8"
                      >
                        <span className="py-5 text-sm font-medium text-fg-primary">{t.entryDate}</span>
                        <span className="py-5 text-sm font-medium text-fg-primary">{t.exitDate}</span>
                        <span className="py-5 text-sm text-fg-secondary">{t.entryPrice}</span>
                        <span className="py-5 text-sm text-fg-secondary">{t.exitPrice}</span>
                        <span className={cn("py-5 text-right text-sm font-semibold", t.up ? "text-positive" : "text-negative")}>{t.pnl}</span>
                        <span className={cn("py-5 text-right text-sm font-medium", t.up ? "text-positive" : "text-negative")}>{t.pnlPct}</span>
                        <span className="py-5 text-right font-cap text-[11px] capitalize text-fg-muted">{t.exitReason}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StrategyBuilder;
