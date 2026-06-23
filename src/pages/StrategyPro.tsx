import { useMemo, useRef, useState } from "react";
import { useRequirePro } from "@/hooks/useRequirePro";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Play,
  Loader2,
  RotateCcw,
  Activity,
  Bookmark,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
  defaultProStrategyConfig,
  validateProStrategy,
  compileProStrategy,
  DATE_PRESETS,
  type ProStrategyConfig,
  type DatePreset,
  type MaRef,
  type MaType,
  type CompareOperator,
} from "@/lib/proStrategy";
import { saveStrategy } from "@/lib/savedStrategies";

// ---------------------------------------------------------------------------
// Helpers (mirrored from StrategyBuilder)
// ---------------------------------------------------------------------------

function ymdDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - Math.max(0, Math.floor(daysAgo)));
  return d.toISOString().slice(0, 10);
}

/** Map a DatePreset to a YYYY-MM-DD start date (mirrors StrategyBuilder's applyDatePreset). */
function presetToStartDate(preset: DatePreset): string {
  if (preset === "YTD") return `${new Date().getFullYear()}-01-01`;
  const map: Record<string, number> = {
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    "2Y": 730,
    "3Y": 1095,
    "5Y": 1825,
  };
  return ymdDaysAgo(map[preset] ?? 365);
}

// ---------------------------------------------------------------------------
// Shared style tokens
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-xl border border-border-strong bg-surface-primary px-3.5 py-2.5 text-[14px] text-fg-primary outline-none transition-colors focus:border-gold";

const selectCls =
  "w-full rounded-xl border border-border-strong bg-surface-primary px-3.5 py-2.5 text-[14px] text-fg-primary outline-none transition-colors focus:border-gold appearance-none cursor-pointer";

const sectionLabelCls =
  "font-cap text-[10px] font-semibold uppercase tracking-widest text-fg-muted";

const fieldLabelCls = "block mb-1.5 text-[13px] font-medium text-fg-secondary";

// ---------------------------------------------------------------------------
// Small reusable sub-components (inline — no need for separate files)
// ---------------------------------------------------------------------------

function MaRefControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MaRef;
  onChange: (v: MaRef) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={fieldLabelCls}>{label}</span>
      <div className="flex gap-2">
        <div className="relative flex-shrink-0">
          <select
            value={value.type}
            onChange={(e) => onChange({ ...value, type: e.target.value as MaType })}
            className={cn(selectCls, "pr-8")}
            style={{ width: 80 }}
          >
            <option value="EMA">EMA</option>
            <option value="SMA">SMA</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
        </div>
        <input
          type="number"
          min={2}
          max={200}
          value={value.period}
          onChange={(e) => onChange({ ...value, period: Math.max(2, parseInt(e.target.value) || 2) })}
          className={inputCls}
          placeholder="Period"
        />
      </div>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={fieldLabelCls}>{label}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(selectCls, "pr-8")}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  suffix,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={fieldLabelCls}>{label}</label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step ?? 1}
          value={value ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? undefined : Number(raw));
          }}
          placeholder={placeholder}
          className={cn(inputCls, suffix && "pr-9")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-fg-muted">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results tile array — extracted so it's shared with the save dialog
// ---------------------------------------------------------------------------

function buildTiles(result: BacktestResult | null, initialCapital: number) {
  const returnPct = result?.total_return_pct;
  return [
    {
      label: "Total return",
      value: formatReturnPct(returnPct),
      sub:
        result?.initial_capital != null && result?.final_capital != null
          ? `$${Math.round(result.initial_capital).toLocaleString()} → $${Math.round(result.final_capital).toLocaleString()}`
          : "Strategy period",
      color: returnPct != null && returnPct < 0 ? "text-negative" : "text-positive",
    },
    { label: "Sharpe ratio", value: result?.sharpe_ratio?.toFixed(2) ?? "—", sub: "Risk-adjusted", color: "text-fg-primary" },
    {
      label: "Max drawdown",
      value: formatDrawdownPct(result?.max_drawdown_pct),
      sub: "Peak-to-trough",
      color: "text-negative",
    },
    {
      label: "Win rate",
      value: formatWinRate(result?.win_rate),
      sub:
        result?.winning_trades != null
          ? `${result.winning_trades} of ${result.total_trades ?? "—"} wins`
          : "—",
      color: "text-fg-primary",
    },
    { label: "Trades", value: result?.total_trades?.toString() ?? "—", sub: "In range", color: "text-fg-primary" },
    {
      label: "Final capital",
      value:
        result?.final_capital != null
          ? `$${result.final_capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          : "—",
      sub: `From $${initialCapital.toLocaleString()}`,
      color:
        result?.final_capital != null && result.final_capital >= initialCapital
          ? "text-positive"
          : "text-negative",
    },
  ];
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const StrategyPro = () => {
  const { user, loading, allowed } = useRequirePro();

  const [config, setConfig] = useState<ProStrategyConfig>(() => defaultProStrategyConfig());
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [resolvedStart, setResolvedStart] = useState<string>("");
  const [resolvedEnd, setResolvedEnd] = useState<string>("");
  const resultsRef = useRef<HTMLDivElement>(null);

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Equity chart data
  const perfData = useMemo(
    () =>
      buildEquityChartData(result?.equity_curve ?? [], {
        dates: result?.equity_curve_dates,
        startDate: resolvedStart,
        endDate: resolvedEnd,
      }),
    [result, resolvedStart, resolvedEnd],
  );

  const tiles = buildTiles(result, config.initialCapital);
  const trades = tradesToLogRows(result?.trades);
  const previewTrades = trades.slice(0, 10);

  // ---- Patch helpers -------------------------------------------------------

  const patch = (partial: Partial<ProStrategyConfig>) =>
    setConfig((c) => ({ ...c, ...partial }));

  // ---- Run -----------------------------------------------------------------

  const handleRun = async () => {
    const err = validateProStrategy(config);
    if (err) {
      toast.error(err);
      return;
    }

    // Resolve dates
    const end = ymdDaysAgo(0);
    const start =
      config.dateMode === "range" ? config.startDate : presetToStartDate(config.preset);

    setResolvedStart(start);
    setResolvedEnd(end);

    const components = compileProStrategy(config);

    const body = {
      strategy_name: config.strategyName.trim() || "pro_strategy",
      symbol: config.symbol.trim().toUpperCase(),
      timeframe: config.timeframe,
      start_date: start,
      end_date: config.dateMode === "range" ? config.endDate : end,
      initial_capital: config.initialCapital,
      components,
    };

    setIsRunning(true);
    setResult(null);
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
      setResult(normalized);
      toast.success("Backtest complete");
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      console.error(e);
      toast.error("Could not run backtest");
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultProStrategyConfig());
    setResult(null);
    toast.info("Reset to defaults");
  };

  const handleSave = async () => {
    if (!user) return;
    const name = saveName.trim();
    if (!name) return toast.error("Give your strategy a name");
    setSaving(true);
    try {
      // Store the real pro config with a discriminator so the library can
      // route pro rows back to the Pro Lab instead of the guided builder.
      await saveStrategy(user.id, {
        name,
        description: saveDesc.trim() || null,
        symbol: config.symbol.trim().toUpperCase() || null,
        draft: { ...config, _source: "pro" } as any,
        result,
      });
      toast.success("Strategy saved to your library");
      setSaveOpen(false);
      setSaveName("");
      setSaveDesc("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save strategy");
    } finally {
      setSaving(false);
    }
  };

  // ---- Loading / gate skeleton --------------------------------------------

  if (loading || !allowed) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-20 md:px-12">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="mb-8 h-10 w-80" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
            <div className="flex flex-col gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[420px] rounded-3xl" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ---- Setup section -------------------------------------------------------

  const renderSetup = () => {
    const s = config.setup;
    return (
      <div className="flex flex-col gap-3">
        <SelectField
          label="Setup mode"
          value={s.mode}
          options={[
            { value: "none", label: "None — no pre-filter" },
            { value: "indicator", label: "Indicator threshold (RSI)" },
            { value: "expression", label: "MA expression (crossover)" },
          ]}
          onChange={(mode) => {
            if (mode === "none") patch({ setup: { mode: "none" } });
            else if (mode === "indicator")
              patch({ setup: { mode: "indicator", indicator: "RSI", period: 14, operator: "<", value: 30 } });
            else
              patch({
                setup: {
                  mode: "expression",
                  left: { type: "EMA", period: 20 },
                  op: "GT",
                  right: { type: "EMA", period: 50 },
                },
              });
          }}
        />
        {s.mode === "indicator" && (
          <>
            <NumberField label="RSI period" value={s.period} onChange={(v) => patch({ setup: { ...s, period: v ?? 14 } })} min={2} max={100} />
            <SelectField
              label="Operator"
              value={s.operator}
              options={
                (["<", ">", "<=", ">=", "=="] as CompareOperator[]).map((op) => ({ value: op, label: op }))
              }
              onChange={(op) => patch({ setup: { ...s, operator: op } })}
            />
            <NumberField label="Threshold value" value={s.value} onChange={(v) => patch({ setup: { ...s, value: v ?? 30 } })} min={0} max={100} step={0.5} />
          </>
        )}
        {s.mode === "expression" && (
          <>
            <MaRefControl
              label="Left MA"
              value={s.left}
              onChange={(left) => patch({ setup: { ...s, left } })}
            />
            <SelectField
              label="Operator"
              value={s.op}
              options={[
                { value: "GT", label: "GT — left > right" },
                { value: "LT", label: "LT — left < right" },
              ]}
              onChange={(op) => patch({ setup: { ...s, op: op as "GT" | "LT" } })}
            />
            <MaRefControl
              label="Right MA"
              value={s.right}
              onChange={(right) => patch({ setup: { ...s, right } })}
            />
          </>
        )}
      </div>
    );
  };

  // ---- Trigger section ------------------------------------------------------

  const renderTrigger = () => {
    const t = config.trigger;
    return (
      <div className="flex flex-col gap-3">
        <SelectField
          label="Trigger mode"
          value={t.mode}
          options={[
            { value: "none", label: "None (always green candle)" },
            { value: "candle_pattern", label: "Candle pattern" },
            { value: "crossover", label: "MA crossover" },
            { value: "price_level", label: "Price level" },
          ]}
          onChange={(mode) => {
            if (mode === "none") patch({ trigger: { mode: "none" } });
            else if (mode === "candle_pattern") patch({ trigger: { mode: "candle_pattern", pattern: "GREEN_CANDLE" } });
            else if (mode === "crossover")
              patch({
                trigger: {
                  mode: "crossover",
                  fast: { type: "EMA", period: 8 },
                  slow: { type: "EMA", period: 21 },
                  crossoverType: "GOLDEN_CROSS",
                },
              });
            else patch({ trigger: { mode: "price_level", level: 0, direction: "ABOVE" } });
          }}
        />

        {t.mode === "candle_pattern" && (
          <SelectField
            label="Pattern"
            value={t.pattern}
            options={[
              { value: "GREEN_CANDLE", label: "Green candle" },
              { value: "RED_CANDLE", label: "Red candle" },
              { value: "DOJI", label: "Doji" },
              { value: "HAMMER", label: "Hammer" },
              { value: "ENGULFING_BULLISH", label: "Bullish engulfing" },
              { value: "ENGULFING_BEARISH", label: "Bearish engulfing" },
            ]}
            onChange={(pattern) => patch({ trigger: { ...t, pattern } })}
          />
        )}

        {t.mode === "crossover" && (
          <>
            <MaRefControl
              label="Fast MA"
              value={t.fast}
              onChange={(fast) => patch({ trigger: { ...t, fast } })}
            />
            <MaRefControl
              label="Slow MA"
              value={t.slow}
              onChange={(slow) => patch({ trigger: { ...t, slow } })}
            />
            <SelectField
              label="Crossover type"
              value={t.crossoverType}
              options={[
                { value: "GOLDEN_CROSS", label: "Golden cross (fast > slow)" },
                { value: "DEATH_CROSS", label: "Death cross (fast < slow)" },
              ]}
              onChange={(crossoverType) =>
                patch({ trigger: { ...t, crossoverType: crossoverType as "GOLDEN_CROSS" | "DEATH_CROSS" } })
              }
            />
          </>
        )}

        {t.mode === "price_level" && (
          <>
            <NumberField
              label="Price level ($)"
              value={t.level}
              onChange={(v) => patch({ trigger: { ...t, level: v ?? 0 } })}
              min={0}
              step={0.01}
              suffix="$"
            />
            <SelectField
              label="Direction"
              value={t.direction}
              options={[
                { value: "ABOVE", label: "Price crosses above" },
                { value: "BELOW", label: "Price crosses below" },
              ]}
              onChange={(direction) =>
                patch({ trigger: { ...t, direction: direction as "ABOVE" | "BELOW" } })
              }
            />
          </>
        )}
      </div>
    );
  };

  // ---- Exit section --------------------------------------------------------

  const renderExit = () => {
    const e = config.exit;
    return (
      <div className="flex flex-col gap-3">
        <SelectField
          label="Exit mode"
          value={e.mode}
          options={[
            { value: "conditions", label: "Conditions (TP / SL / trailing)" },
            { value: "time", label: "Time-based (max holding days)" },
            { value: "death_cross", label: "Death cross (EMA 8/21)" },
          ]}
          onChange={(mode) => {
            if (mode === "conditions") patch({ exit: { mode: "conditions", takeProfitPct: 10, stopLossPct: 5 } });
            else if (mode === "time") patch({ exit: { mode: "time", maxHoldingDays: 10 } });
            else patch({ exit: { mode: "death_cross" } });
          }}
        />

        {e.mode === "conditions" && (
          <>
            <NumberField
              label="Take profit"
              value={e.takeProfitPct}
              onChange={(v) => patch({ exit: { ...e, takeProfitPct: v } })}
              min={0}
              step={0.5}
              suffix="%"
            />
            <NumberField
              label="Stop loss"
              value={e.stopLossPct}
              onChange={(v) => patch({ exit: { ...e, stopLossPct: v } })}
              min={0}
              step={0.5}
              suffix="%"
            />
            <NumberField
              label="Trailing stop"
              value={e.trailingPct}
              onChange={(v) => patch({ exit: { ...e, trailingPct: v } })}
              min={0}
              step={0.5}
              suffix="%"
            />
            <NumberField
              label="Anchor offset"
              value={e.anchorOffsetPct}
              onChange={(v) => patch({ exit: { ...e, anchorOffsetPct: v } })}
              min={0}
              step={0.5}
              suffix="%"
            />
          </>
        )}

        {e.mode === "time" && (
          <NumberField
            label="Max holding days"
            value={e.maxHoldingDays}
            onChange={(v) => patch({ exit: { ...e, maxHoldingDays: v ?? 10 } })}
            min={1}
            max={365}
          />
        )}
      </div>
    );
  };

  // ---- Render --------------------------------------------------------------

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />

      <main className="mx-auto w-full max-w-[1400px] flex-1">
        {/* Hero */}
        <section className="px-6 pb-10 pt-20 md:px-12 md:pt-28">
          <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">
            Strategy lab · Pro
          </p>
          <h1 className="mt-4 max-w-[680px] font-serif text-[36px] font-medium leading-[1.1] text-fg-primary md:text-[48px]">
            Full-parameter backtest builder.
          </h1>
          <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-fg-secondary">
            Every lever exposed. Set up a market filter, an entry trigger, and an
            exit strategy — then replay against real history.
          </p>
        </section>

        {/* Two-column layout */}
        <section className="px-6 pb-32 md:px-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
            {/* ---- LEFT: params panel ---- */}
            <div className="flex flex-col gap-6">

              {/* Strategy meta */}
              <div className="rounded-2xl border border-border-subtle bg-card p-6">
                <p className={cn(sectionLabelCls, "mb-4")}>Strategy</p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className={fieldLabelCls}>Name</label>
                    <input
                      value={config.strategyName}
                      onChange={(e) => patch({ strategyName: e.target.value })}
                      className={inputCls}
                      placeholder="pro_strategy"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={fieldLabelCls}>Symbol</label>
                    <input
                      value={config.symbol}
                      onChange={(e) => patch({ symbol: e.target.value.toUpperCase() })}
                      className={inputCls}
                      placeholder="AAPL"
                    />
                  </div>
                  <SelectField
                    label="Timeframe"
                    value={config.timeframe}
                    options={[
                      { value: "1d", label: "Daily (1d)" },
                    ]}
                    onChange={(timeframe) => patch({ timeframe })}
                  />
                  <NumberField
                    label="Initial capital"
                    value={config.initialCapital}
                    onChange={(v) => patch({ initialCapital: v ?? 10000 })}
                    min={1}
                    suffix="$"
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="rounded-2xl border border-border-subtle bg-card p-6">
                <p className={cn(sectionLabelCls, "mb-4")}>Date range</p>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    {(["preset", "range"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => patch({ dateMode: m })}
                        className={cn(
                          "flex-1 rounded-xl border py-2 font-cap text-[12px] font-semibold transition-colors",
                          config.dateMode === m
                            ? "border-gold bg-gold/10 text-gold-deep"
                            : "border-border-strong text-fg-muted hover:border-gold/50",
                        )}
                      >
                        {m === "preset" ? "Preset" : "Custom range"}
                      </button>
                    ))}
                  </div>

                  {config.dateMode === "preset" ? (
                    <div className="flex flex-wrap gap-2">
                      {DATE_PRESETS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => patch({ preset: p })}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 font-cap text-[12px] font-medium transition-colors",
                            config.preset === p
                              ? "border-gold bg-gold/10 text-gold-deep"
                              : "border-border-strong text-fg-muted hover:border-gold/50",
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className={fieldLabelCls}>Start</label>
                        <input
                          type="date"
                          value={config.startDate}
                          onChange={(e) => patch({ startDate: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={fieldLabelCls}>End</label>
                        <input
                          type="date"
                          value={config.endDate}
                          onChange={(e) => patch({ endDate: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Setup */}
              <div className="rounded-2xl border border-border-subtle bg-card p-6">
                <p className={cn(sectionLabelCls, "mb-4")}>
                  1 · Setup{" "}
                  <span className="ml-1 normal-case font-sans font-normal tracking-normal text-fg-muted">
                    — market pre-filter
                  </span>
                </p>
                {renderSetup()}
              </div>

              {/* Trigger */}
              <div className="rounded-2xl border border-border-subtle bg-card p-6">
                <p className={cn(sectionLabelCls, "mb-4")}>
                  2 · Trigger{" "}
                  <span className="ml-1 normal-case font-sans font-normal tracking-normal text-fg-muted">
                    — entry signal
                  </span>
                </p>
                {renderTrigger()}
              </div>

              {/* Exit */}
              <div className="rounded-2xl border border-border-subtle bg-card p-6">
                <p className={cn(sectionLabelCls, "mb-4")}>
                  3 · Exit{" "}
                  <span className="ml-1 normal-case font-sans font-normal tracking-normal text-fg-muted">
                    — position close
                  </span>
                </p>
                {renderExit()}
              </div>

              {/* Run / reset buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => void handleRun()}
                  disabled={isRunning}
                  className="flex w-full items-center justify-center gap-3 rounded-full bg-ink px-8 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Running…
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" /> Run backtest
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-border-strong px-8 py-3 text-[14px] font-semibold text-fg-secondary transition-colors hover:border-ink hover:text-fg-primary"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
                </button>
              </div>
            </div>

            {/* ---- RIGHT: results panel ---- */}
            <div ref={resultsRef} className="flex flex-col gap-6">

              {/* Equity curve */}
              <div className="rounded-3xl border border-border-subtle bg-card p-8 md:p-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl font-medium text-fg-primary">Equity curve</h3>
                    <p className="mt-1.5 text-[14px] text-fg-muted">
                      {result
                        ? `${resolvedStart} – ${resolvedEnd}`
                        : "Configure params on the left, then run a backtest"}
                    </p>
                  </div>
                  {result && (
                    <button
                      type="button"
                      onClick={() => {
                        setSaveName(config.strategyName || "Pro strategy");
                        setSaveOpen(true);
                      }}
                      className="flex-shrink-0 flex items-center gap-2 rounded-full border border-border-strong px-4 py-2 text-sm font-semibold text-fg-primary transition-colors hover:border-ink"
                    >
                      <Bookmark className="h-3.5 w-3.5" /> Save
                    </button>
                  )}
                </div>

                <div className="mt-8 h-[280px] w-full">
                  {perfData.length === 0 ? (
                    <div
                      className={cn(
                        "flex h-full items-center justify-center rounded-2xl bg-surface-sunken/50 font-cap text-sm text-fg-muted",
                        isRunning && "animate-pulse",
                      )}
                    >
                      {isRunning
                        ? "Replaying every trade against history…"
                        : "Your equity curve will appear here"}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={perfData}>
                        <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "hsl(var(--fg-muted))", fontSize: 11 }}
                        />
                        <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "10px",
                          }}
                          formatter={(v: number) => [`$${Math.round(v).toLocaleString()}`, "Equity"]}
                          labelFormatter={(l) => String(l)}
                        />
                        <Line
                          type="monotone"
                          dataKey="strategy"
                          stroke="hsl(var(--accent-deep))"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Metric tiles */}
              <div
                key={result ? "results" : "empty"}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3"
              >
                {tiles.map((t, i) => (
                  <div
                    key={t.label}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className="stagger-fade flex flex-col gap-3 rounded-2xl border border-border-subtle bg-card px-5 py-6"
                  >
                    <span className="font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                      {t.label}
                    </span>
                    <span className={cn("font-serif text-3xl font-medium", t.color)}>{t.value}</span>
                    <span className="text-xs text-fg-muted">{t.sub}</span>
                  </div>
                ))}
              </div>

              {/* Trade log */}
              <div className="overflow-hidden rounded-3xl border border-border-subtle bg-card">
                <div className="flex items-center justify-between px-8 py-6">
                  <h3 className="font-serif text-xl font-medium text-fg-primary">Trade log</h3>
                  <span className="text-[13px] text-fg-muted">
                    {result?.total_trades
                      ? `${previewTrades.length} of ${result.total_trades} trades`
                      : "No trades yet"}
                  </span>
                </div>
                {previewTrades.length === 0 ? (
                  <p className="px-8 pb-8 font-cap text-sm text-fg-muted">
                    {isRunning
                      ? "Running…"
                      : "Trades from your backtest will appear here."}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-[minmax(88px,1fr)_minmax(88px,1fr)_72px_72px_64px_72px_minmax(80px,1fr)] gap-2 bg-surface-sunken px-8 font-cap text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                      {["Buy date", "Sell date", "Entry", "Exit", "P/L $", "P/L %", "Exit reason"].map(
                        (h, i) => (
                          <span
                            key={h}
                            className={cn("py-4", i >= 4 && i <= 5 && "text-right", i === 6 && "text-right")}
                          >
                            {h}
                          </span>
                        ),
                      )}
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
                        <span className={cn("py-5 text-right text-sm font-semibold", t.up ? "text-positive" : "text-negative")}>
                          {t.pnl}
                        </span>
                        <span className={cn("py-5 text-right text-sm font-medium", t.up ? "text-positive" : "text-negative")}>
                          {t.pnlPct}
                        </span>
                        <span className="py-5 text-right font-cap text-[11px] capitalize text-fg-muted">
                          {t.exitReason}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Pro badge */}
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gold-deep" />
                <span className="font-cap text-[11px] font-semibold uppercase tracking-widest text-gold-deep">
                  Pro Strategy Lab
                </span>
              </div>
            </div>
          </div>
        </section>
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
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My pro strategy"
                className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-fg-primary">Notes (optional)</label>
              <input
                value={saveDesc}
                onChange={(e) => setSaveDesc(e.target.value)}
                placeholder="What you're testing, why it matters…"
                className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ink"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setSaveOpen(false)}
              className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-fg-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
              {saving ? "Saving…" : "Save strategy"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default StrategyPro;
