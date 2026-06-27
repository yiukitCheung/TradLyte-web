import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowRight, Play, RotateCcw, Activity, Loader2, Bookmark, Library, GraduationCap, ChevronDown, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveStrategy } from "@/lib/savedStrategies";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
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
  deriveSetupTileKey,
  setupPatchForTile,
  TIMEFRAMES,
  timeframeLabel,
  isCoarserOrEqual,
  type StrategyDraft,
  type BacktestRequestBody,
} from "@/lib/strategyDraft";
import {
  BACKTEST_RECIPES,
  getRecipeById,
  applyTimeframeToComponents,
  type BacktestRecipe,
} from "@/lib/backtestRecipes";
import { SetupPanel, EntryPanel, ExitPanel } from "@/components/strategy-builder/GuidedStrategyFlow";
import { LessonDrawerProvider } from "@/components/strategy-builder/LessonDrawer";
import StrategySentenceCard from "@/components/strategy-builder/StrategySentenceCard";
import TermInfo from "@/components/strategy-builder/TermInfo";

type Tab = "setup" | "entry" | "exit";
const TABS: { id: Tab; label: string }[] = [
  { id: "setup", label: "Setup" },
  { id: "entry", label: "Entry" },
  { id: "exit", label: "Exit" },
];

function ymdDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - Math.max(0, Math.floor(daysAgo)));
  return d.toISOString().slice(0, 10);
}

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface-primary px-4 py-3 text-[15px] text-fg-primary outline-none transition-colors focus:border-gold";

const StrategyBuilder = () => {
  const { user, loading } = useRequireOnboarding();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<Tab>("setup");
  const [draft, setDraft] = useState<StrategyDraft>(() => defaultStrategyDraft());
  const [activeRecipe, setActiveRecipe] = useState<BacktestRecipe | null>(null);
  const [backtestSymbol, setBacktestSymbol] = useState("AAPL");
  const [initialCapital, setInitialCapital] = useState("10000");
  const [backtestStart, setBacktestStart] = useState(() => ymdDaysAgo(365));
  const [backtestEnd, setBacktestEnd] = useState(() => ymdDaysAgo(0));
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Setup tile memory — preserves each lens's settings when switching tiles.
  const [activeSetupTile, setActiveSetupTile] = useState<string>(() => deriveSetupTileKey(defaultStrategyDraft()));
  const setupMem = useRef<Record<string, StrategyDraft["setup"]>>({});

  // Save-strategy dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [savingStrategy, setSavingStrategy] = useState(false);

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
  const tiles: Array<{ label: string; value: string; sub: string; color: string; term?: string }> = [
    {
      label: "Total return",
      term: "totalReturn",
      value: formatReturnPct(returnPct),
      sub:
        backtestResult?.initial_capital != null && backtestResult?.final_capital != null
          ? `$${Math.round(backtestResult.initial_capital).toLocaleString()} → $${Math.round(backtestResult.final_capital).toLocaleString()}`
          : "Strategy period",
      color: returnPct != null && returnPct < 0 ? "text-negative" : "text-positive",
    },
    { label: "Sharpe ratio", term: "sharpe", value: backtestResult?.sharpe_ratio?.toFixed(2) ?? "—", sub: "Risk-adjusted", color: "text-fg-primary" },
    { label: "Max drawdown", term: "maxDrawdown", value: formatDrawdownPct(backtestResult?.max_drawdown_pct), sub: "Peak-to-trough", color: "text-negative" },
    {
      label: "Win rate",
      term: "winRate",
      value: formatWinRate(backtestResult?.win_rate),
      sub: backtestResult?.winning_trades != null ? `${backtestResult.winning_trades} of ${backtestResult.total_trades ?? "—"} wins` : "—",
      color: "text-fg-primary",
    },
    { label: "Trades", value: backtestResult?.total_trades?.toString() ?? "—", sub: "In range", color: "text-fg-primary" },
    {
      label: "Final capital",
      value: backtestResult?.final_capital != null ? `$${backtestResult.final_capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—",
      sub: `From $${Number(initialCapital).toLocaleString()}`,
      color: backtestResult?.final_capital != null && backtestResult.final_capital >= Number(initialCapital) ? "text-positive" : "text-negative",
    },
  ];
  const previewTrades = tradesToLogRows(backtestResult?.trades).slice(0, 10);

  // --- patch helpers (editing drops any active preset) ---
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
  const patchTimeframe = (tf: string) =>
    setDraft((d) => ({
      ...d,
      timeframe: tf,
      setup: { ...d.setup, timeframe: d.setup.timeframe && isCoarserOrEqual(d.setup.timeframe, tf) ? d.setup.timeframe : undefined },
    }));

  // Switch setup lens — stash the current lens's settings, restore the target's.
  const selectSetupTile = (key: string) => {
    setActiveRecipe(null);
    setDraft((d) => {
      setupMem.current[activeSetupTile] = d.setup;
      const restored = setupMem.current[key];
      return { ...d, setup: restored ?? { ...d.setup, ...setupPatchForTile(key) } };
    });
    setActiveSetupTile(key);
  };

  const applyRecipe = async (recipeId: string) => {
    const recipe = getRecipeById(recipeId);
    if (!recipe) return toast.error("Recipe not found");
    const recipeDraft = draftFromRecipeId(recipeId) ?? defaultStrategyDraft();
    setDraft(recipeDraft);
    setActiveSetupTile(deriveSetupTileKey(recipeDraft));
    setActiveRecipe(recipe);
    setShowTemplates(false);
    toast.message(`Running ${recipe.title}…`);
    await runBacktest(recipe);
  };

  const applyDatePreset = (preset: string) => {
    if (preset === "YTD") setBacktestStart(`${new Date().getFullYear()}-01-01`);
    else {
      const map: Record<string, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "2Y": 730 };
      setBacktestStart(ymdDaysAgo(map[preset] ?? 365));
    }
    setBacktestEnd(ymdDaysAgo(0));
  };

  const resetAll = () => {
    const fresh = defaultStrategyDraft();
    setDraft(fresh);
    setActiveSetupTile(deriveSetupTileKey(fresh));
    setupMem.current = {};
    setActiveRecipe(null);
    setBacktestResult(null);
    setTab("setup");
    toast.info("Strategy reset");
  };

  const handleSaveStrategy = async () => {
    if (!user) return;
    const name = saveName.trim();
    if (!name) return toast.error("Give your strategy a name");
    setSavingStrategy(true);
    try {
      await saveStrategy(user.id, {
        name,
        description: saveDesc.trim() || null,
        symbol: backtestSymbol.trim().toUpperCase() || null,
        draft: { ...draft, strategyName: name },
        result: backtestResult,
      });
      toast.success("Strategy saved to your library");
      setSaveOpen(false);
      setSaveName("");
      setSaveDesc("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save strategy");
    } finally {
      setSavingStrategy(false);
    }
  };

  const runBacktest = async (recipeOverride?: BacktestRecipe) => {
    const cap = Number(initialCapital);
    if (!Number.isFinite(cap) || cap <= 0) return toast.error("Enter a valid starting capital");

    const recipe = recipeOverride ?? activeRecipe;
    let body: BacktestRequestBody;
    if (recipe) {
      const tf = draft.timeframe || "1d";
      body = {
        strategy_name: recipe.strategy_name,
        symbol: backtestSymbol.trim().toUpperCase(),
        timeframe: tf,
        start_date: backtestStart,
        end_date: backtestEnd,
        initial_capital: cap,
        components: applyTimeframeToComponents(recipe.components, tf),
      };
    } else {
      const err = validateDraft(draft);
      if (err) return toast.error(err);
      body = buildBacktestRequest(draft, { symbol: backtestSymbol, startDate: backtestStart, endDate: backtestEnd, initialCapital: cap });
    }

    setIsBacktesting(true);
    setBacktestResult(null);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
      setBacktestResult(normalizeBacktestResponse(json.data, body.strategy_name));
      toast.success("Backtest complete");
    } catch (e) {
      console.error(e);
      toast.error("Could not run backtest");
    } finally {
      setIsBacktesting(false);
    }
  };

  // Loaded from the library / a lesson: preload its draft.
  useEffect(() => {
    const incoming = location.state as { draft?: StrategyDraft; symbol?: string } | null;
    if (incoming?.draft) {
      setDraft(incoming.draft);
      setActiveSetupTile(deriveSetupTileKey(incoming.draft));
      setActiveRecipe(null);
      if (incoming.symbol) setBacktestSymbol(incoming.symbol);
      navigate("/strategy-builder", { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">Loading…</div>;
  }
  if (!user) return null;

  const openSave = () => {
    setSaveName(activeRecipe?.title ?? draft.strategyName ?? "");
    setSaveOpen(true);
  };

  return (
    <LessonDrawerProvider>
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto w-full max-w-[1200px] flex-1">
          {/* Hero */}
          <section className="px-6 pb-8 pt-16 md:px-12 md:pt-24">
            <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">Strategy lab</p>
            <h1 className="mt-4 max-w-[680px] font-serif text-[38px] font-medium leading-[1.08] text-fg-primary md:text-[48px]">
              Compose a strategy, replay it on real history.
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowTemplates((s) => !s)}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 font-cap text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" /> Start from a template
                <ChevronDown className={cn("h-4 w-4 transition-transform", showTemplates && "rotate-180")} />
              </button>
              <Link to="/strategy-library" className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-5 py-2.5 font-cap text-sm font-medium text-fg-primary transition-colors hover:border-ink">
                <Library className="h-4 w-4 text-gold-deep" /> Saved strategies
              </Link>
              <Link to="/learn" className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-5 py-2.5 font-cap text-sm font-medium text-fg-primary transition-colors hover:border-ink">
                <GraduationCap className="h-4 w-4 text-gold-deep" /> 2-min primer
              </Link>
            </div>
          </section>

          {/* Templates disclosure */}
          {showTemplates && (
            <section className="animate-slide-in px-6 pb-10 md:px-12">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {BACKTEST_RECIPES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => void applyRecipe(r.id)}
                    disabled={isBacktesting}
                    className="group flex flex-col gap-3 rounded-2xl border border-border-subtle bg-card p-6 text-left transition-all hover:border-gold/40 hover:shadow-sm disabled:opacity-60"
                  >
                    <Activity className="h-5 w-5 text-gold-deep" />
                    <h3 className="font-serif text-lg font-medium text-fg-primary">{r.title}</h3>
                    <p className="text-[14px] leading-relaxed text-fg-secondary">{r.description}</p>
                    <span className="mt-1 flex items-center gap-1.5 font-cap text-sm font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100">
                      {isBacktesting ? "Running…" : "Load + run"} <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Composer: config (left) + sticky receipt rail (right) */}
          <section className="grid gap-8 px-6 pb-16 md:px-12 lg:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-8">
              {/* Tabs */}
              <div className="flex items-center gap-1 rounded-full border border-border-subtle bg-card p-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex-1 rounded-full px-4 py-2.5 font-cap text-sm font-semibold transition-colors",
                      tab === t.id ? "bg-ink text-white" : "text-fg-secondary hover:text-fg-primary",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Active panel */}
              <div className="animate-fade-in">
                {tab === "setup" && (
                  <SetupPanel draft={draft} patchSetup={patchSetup} activeTile={activeSetupTile} onSelectTile={selectSetupTile} />
                )}
                {tab === "entry" && <EntryPanel draft={draft} patchTrigger={patchTrigger} />}
                {tab === "exit" && <ExitPanel draft={draft} patchExit={patchExit} />}
              </div>

              {/* Tab nav */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  disabled={tab === "setup"}
                  onClick={() => setTab(tab === "exit" ? "entry" : "setup")}
                  className="font-cap text-sm text-fg-muted hover:text-fg-primary disabled:opacity-0"
                >
                  ← Back
                </button>
                {tab !== "exit" && (
                  <button
                    type="button"
                    onClick={() => setTab(tab === "setup" ? "entry" : "exit")}
                    className="inline-flex items-center gap-2 rounded-full border border-border-strong px-5 py-2.5 font-cap text-sm font-semibold text-fg-primary transition-colors hover:border-ink"
                  >
                    Next: {tab === "setup" ? "Entry" : "Exit"} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Sticky receipt + run rail */}
            <aside className="flex h-fit flex-col gap-5 lg:sticky lg:top-24">
              <StrategySentenceCard draft={draft} onReset={resetAll} compact />

              <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-5">
                <label className="flex flex-col gap-2">
                  <span className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">Symbol</span>
                  <input value={backtestSymbol} onChange={(e) => setBacktestSymbol(e.target.value.toUpperCase())} className={inputCls} placeholder="AAPL" />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">
                    Timeframe <TermInfo termKey="timeframe" />
                  </span>
                  <select value={draft.timeframe} onChange={(e) => patchTimeframe(e.target.value)} className={inputCls}>
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf} value={tf}>{timeframeLabel(tf)}</option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-2">
                  <span className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">Period</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["1M", "3M", "6M", "1Y", "2Y", "YTD"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => applyDatePreset(d)}
                        className="rounded-full border border-border-strong px-3 py-1.5 font-cap text-xs font-medium text-fg-secondary transition-colors hover:border-gold hover:text-fg-primary"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={backtestStart} onChange={(e) => setBacktestStart(e.target.value)} className={inputCls} />
                    <input type="date" value={backtestEnd} onChange={(e) => setBacktestEnd(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">Starting capital</span>
                  <input value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} className={inputCls} />
                </label>

                <button
                  type="button"
                  onClick={() => void runBacktest()}
                  disabled={isBacktesting}
                  className="flex w-full items-center justify-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isBacktesting ? <><Loader2 className="h-5 w-5 animate-spin" /> Running…</> : <><Play className="h-5 w-5" /> Run backtest</>}
                </button>
                {backtestResult && (
                  <button type="button" onClick={openSave} className="flex w-full items-center justify-center gap-2 rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold text-fg-primary transition-colors hover:border-ink">
                    <Bookmark className="h-4 w-4" /> Save to library
                  </button>
                )}
                {activeRecipe && (
                  <p className="text-center font-cap text-xs text-fg-muted">Template: {activeRecipe.title} · edit any rule to make it yours</p>
                )}
              </div>
            </aside>
          </section>

          {/* Results (full width, after a run) */}
          {(isBacktesting || backtestResult) && (
            <section ref={resultsRef} className="animate-fade-in px-6 pb-32 md:px-12">
              <div className="flex flex-col gap-8">
                <div className="rounded-3xl border border-border-subtle bg-card p-8 md:p-10">
                  <h3 className="font-serif text-2xl font-medium text-fg-primary">Equity curve</h3>
                  <p className="mt-2 text-[15px] text-fg-muted">
                    {backtestResult ? `${backtestSymbol} · ${backtestStart} – ${backtestEnd}` : "Replaying every trade against history…"}
                  </p>
                  <div className="mt-8 h-[300px] w-full">
                    {perfData.length === 0 ? (
                      <div className={cn("flex h-full items-center justify-center rounded-2xl bg-surface-sunken/50 font-cap text-sm text-fg-muted", isBacktesting && "animate-pulse")}>
                        {isBacktesting ? "Replaying every trade against history…" : "No equity data for this run"}
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

                <div key={backtestResult ? "results" : "empty"} className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {tiles.map((t, i) => (
                    <div key={t.label} style={{ animationDelay: `${i * 60}ms` }} className="stagger-fade flex flex-col gap-2 rounded-2xl border border-border-subtle bg-card px-6 py-6">
                      <span className="flex items-center gap-1 font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                        {t.label}
                        {t.term && <TermInfo termKey={t.term} />}
                      </span>
                      <span className={cn("font-serif text-3xl font-medium", t.color)}>{t.value}</span>
                      <span className="text-xs text-fg-muted">{t.sub}</span>
                    </div>
                  ))}
                </div>

                <div className="overflow-hidden rounded-3xl border border-border-subtle bg-card">
                  <div className="flex items-center justify-between px-8 py-6">
                    <h3 className="font-serif text-xl font-medium text-fg-primary">Trade log</h3>
                    <span className="text-[14px] text-fg-muted">
                      {backtestResult?.total_trades ? `${previewTrades.length} of ${backtestResult.total_trades} trades` : "No trades"}
                    </span>
                  </div>
                  {previewTrades.length === 0 ? (
                    <p className="px-8 pb-10 font-cap text-sm text-fg-muted">
                      {isBacktesting ? "Simulating…" : "No trades fired in this window. Try a longer period or a looser setup."}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-[minmax(88px,1fr)_minmax(88px,1fr)_72px_72px_64px_72px_minmax(80px,1fr)] gap-2 bg-surface-sunken px-8 font-cap text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                        {["Buy date", "Sell date", "Entry", "Exit", "P/L $", "P/L %", "Exit reason"].map((h, i) => (
                          <span key={h} className={cn("py-4", i >= 4 && "text-right")}>{h}</span>
                        ))}
                      </div>
                      {previewTrades.map((t, i) => (
                        <div key={`${t.entryDate}-${t.exitDate}-${i}`} className="grid grid-cols-[minmax(88px,1fr)_minmax(88px,1fr)_72px_72px_64px_72px_minmax(80px,1fr)] items-center gap-2 border-t border-border-subtle px-8">
                          <span className="py-4 text-sm font-medium text-fg-primary">{t.entryDate}</span>
                          <span className="py-4 text-sm font-medium text-fg-primary">{t.exitDate}</span>
                          <span className="py-4 text-sm text-fg-secondary">{t.entryPrice}</span>
                          <span className="py-4 text-sm text-fg-secondary">{t.exitPrice}</span>
                          <span className={cn("py-4 text-right text-sm font-semibold", t.up ? "text-positive" : "text-negative")}>{t.pnl}</span>
                          <span className={cn("py-4 text-right text-sm font-medium", t.up ? "text-positive" : "text-negative")}>{t.pnlPct}</span>
                          <span className="py-4 text-right font-cap text-[11px] capitalize text-fg-muted">{t.exitReason}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Save dialog */}
        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save to your library</DialogTitle>
              <DialogDescription>Name this strategy so you can re-run or tweak it later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-fg-primary">Name</label>
                <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="My golden-cross swing" className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-fg-primary">Notes (optional)</label>
                <input value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} placeholder="What you're testing, why it matters…" className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink" />
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setSaveOpen(false)} className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-fg-primary">Cancel</button>
              <button onClick={handleSaveStrategy} disabled={savingStrategy} className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {savingStrategy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
                {savingStrategy ? "Saving…" : "Save strategy"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Footer />
      </div>
    </LessonDrawerProvider>
  );
};

export default StrategyBuilder;
