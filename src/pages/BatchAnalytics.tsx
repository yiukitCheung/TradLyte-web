import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Bookmark, ArrowLeft } from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell as RCell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  cellMetrics,
  pickChampion,
  strategyConsistency,
  leaderboard,
  strategyTitle,
  type CellMetrics,
  type LensMetric,
} from "@/lib/batchBacktest";
import { getBatchRun, updateBatchDdCap, type SavedBatchRunDetail, type SavedBatchCell } from "@/lib/savedBatches";
import { draftFromRecipeId } from "@/lib/strategyDraft";
import { saveStrategy } from "@/lib/savedStrategies";

// Chart palette (recharts needs literal colors, not CSS-var tokens).
const INK = "#384F84";
const GOLD = "#C8B496";
const GOLD_DEEP = "#9A8358";
const HAIR = "#E4DECF";
const MUTED = "#6F6A5F";
const FADE = "rgba(111,106,95,0.28)";

const LENSES: { key: LensMetric; label: string }[] = [
  { key: "return", label: "Return" },
  { key: "sharpe", label: "Sharpe" },
  { key: "drawdown", label: "Drawdown" },
];

function cellKey(symbol: string, strategyId: string): string {
  return `${symbol}|${strategyId}`;
}

/** Navy intensity ramp: card → deep navy by goodness t in [0,1]. */
function rampColor(t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(251 + (56 - 251) * c);
  const g = Math.round(249 + (79 - 249) * c);
  const b = Math.round(243 + (132 - 243) * c);
  return `rgb(${r}, ${g}, ${b})`;
}

function metricValue(m: CellMetrics, lens: LensMetric): number | null {
  return lens === "sharpe" ? m.sharpe : lens === "drawdown" ? m.dd : m.ret;
}

function fmtLens(m: CellMetrics, lens: LensMetric): string {
  const v = metricValue(m, lens);
  if (v == null) return "—";
  if (lens === "sharpe") return v.toFixed(1);
  if (lens === "drawdown") return `−${Math.round(v)}%`;
  return `${v >= 0 ? "+" : "−"}${Math.abs(Math.round(v))}%`;
}

const BatchAnalytics = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useRequireOnboarding();
  const navigate = useNavigate();

  const [run, setRun] = useState<SavedBatchRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [ddCap, setDdCap] = useState(12);
  const [lens, setLens] = useState<LensMetric>("return");
  const [hovered, setHovered] = useState<string | null>(null);
  const capTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user || !id) return;
      setLoading(true);
      try {
        const detail = await getBatchRun(id);
        if (!alive) return;
        if (!detail) {
          setNotFound(true);
        } else {
          setRun(detail);
          setDdCap(detail.ddCap ?? 12);
        }
      } catch (e) {
        console.error(e);
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, id]);

  // Persist the cap a beat after the user stops dragging.
  const onCapChange = useCallback(
    (v: number) => {
      setDdCap(v);
      if (capTimer.current) clearTimeout(capTimer.current);
      capTimer.current = setTimeout(() => {
        if (id) updateBatchDdCap(id, v).catch((e) => console.error(e));
      }, 600);
    },
    [id],
  );

  const cells = useMemo<SavedBatchCell[]>(() => run?.cells ?? [], [run]);
  const metrics = useMemo(
    () => cells.map((c) => cellMetrics({ symbol: c.symbol, strategyId: c.strategyId, status: c.status, result: c.result })),
    [cells],
  );
  const completed = useMemo(() => metrics.filter((m) => m.ret != null), [metrics]);
  const champion = useMemo(() => pickChampion(metrics, ddCap), [metrics, ddCap]);
  const consistency = useMemo(() => strategyConsistency(metrics), [metrics]);
  // Whisker scale derived from the real Sharpe range (handles low/negative values), padded 12%.
  const sharpeDomain = useMemo(() => {
    const vals = consistency.flatMap((s) => [s.minSharpe, s.maxSharpe, s.avgSharpe].filter((v): v is number => v != null));
    if (!vals.length) return { lo: 0, hi: 1 };
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min || 1) * 0.12;
    return { lo: min - pad, hi: max + pad };
  }, [consistency]);
  const board = useMemo(() => leaderboard(metrics, 6), [metrics]);
  const nFit = useMemo(() => metrics.filter((m) => m.ret != null && m.dd != null && m.dd <= ddCap).length, [metrics, ddCap]);

  const metricByKey = useMemo(() => {
    const map = new Map<string, CellMetrics>();
    metrics.forEach((m) => map.set(cellKey(m.symbol, m.strategyId), m));
    return map;
  }, [metrics]);

  const championCell = useMemo(
    () => (champion ? cells.find((c) => c.symbol === champion.symbol && c.strategyId === champion.strategyId) ?? null : null),
    [champion, cells],
  );

  const trade = useMemo(() => deriveTradeStats(championCell), [championCell]);

  // Matrix goodness range for the current lens.
  const lensRange = useMemo(() => {
    const vals = completed.map((m) => metricValue(m, lens)).filter((v): v is number => v != null);
    return { min: vals.length ? Math.min(...vals) : 0, max: vals.length ? Math.max(...vals) : 1 };
  }, [completed, lens]);

  const goodness = (m: CellMetrics): number | null => {
    const v = metricValue(m, lens);
    if (v == null) return null;
    const span = lensRange.max - lensRange.min || 1;
    const t = (v - lensRange.min) / span;
    return lens === "drawdown" ? 1 - t : t;
  };

  const scatterData = useMemo(
    () => completed.filter((m) => m.dd != null).map((m) => ({ x: m.dd as number, y: m.ret as number, key: cellKey(m.symbol, m.strategyId), label: `${m.strategyTitle} · ${m.symbol}` })),
    [completed],
  );

  const { equityData, equityKeys, championEqKey } = useMemo(() => buildEquityOverlay(cells, board, champion), [cells, board, champion]);

  const openInLab = () => {
    if (!champion) return;
    const draft = draftFromRecipeId(champion.strategyId);
    navigate("/strategy-builder", { state: { draft: draft ?? undefined, symbol: champion.symbol } });
  };

  const saveDeployed = async () => {
    if (!user || !champion) return;
    const draft = draftFromRecipeId(champion.strategyId);
    if (!draft) {
      toast.info("This strategy runs from a preset — open it in the Lab to save a copy.");
      return;
    }
    try {
      await saveStrategy(user.id, {
        name: `${champion.strategyTitle} · ${champion.symbol} (deployed)`,
        symbol: champion.symbol,
        draft: { ...draft, strategyName: `${champion.strategyTitle} · ${champion.symbol}` },
        result: championCell?.result ?? null,
      });
      toast.success("Saved to your strategy library");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto w-full max-w-[820px] flex-1 px-6 py-12 md:px-12">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="mt-4 h-[220px] w-full rounded-2xl" />
          <Skeleton className="mt-4 h-[260px] w-full rounded-2xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !run) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <p className="font-serif text-2xl text-fg-primary">This batch isn't here</p>
          <p className="mt-2 text-[15px] text-fg-secondary">It may have been deleted, or belongs to another account.</p>
          <Link to="/strategy-lab/batch" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">
            Start a new batch
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const robust = championRobustness(champion, consistency);

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-10 md:px-12">
        <div className="flex items-center justify-between">
          <Link to="/strategy-lab/batch" className="inline-flex items-center gap-1.5 font-cap text-[12px] font-semibold uppercase tracking-[0.12em] text-fg-secondary hover:text-fg-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> New batch
          </Link>
          <p className="font-cap text-[11px] uppercase tracking-[0.14em] text-gold-deep">
            {completed.length} of {cells.length} runs · {run.tickers.length} tickers × {run.strategyIds.length} strategies
          </p>
        </div>

        {/* ============ HERO VERDICT ============ */}
        <section className="mt-5 rounded-[20px] border border-gold bg-card p-6 md:p-9">
          <div className="flex items-center gap-2.5">
            <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">The verdict</span>
            <span className="h-px flex-1 bg-border-subtle" />
            <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-deep">{run.name}</span>
          </div>

          {champion ? (
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
              <div>
                <p className="text-[13px] text-fg-muted">Of everything you ran, one configuration earns your conviction.</p>
                <h1 className="mt-1 font-serif text-[36px] font-medium leading-[1.06] text-fg-primary md:text-[46px]">
                  Deploy <em className="not-italic text-ink">{champion.strategyTitle}</em> on <em className="not-italic text-ink">{champion.symbol}</em>
                </h1>
                <div className="mt-4 font-serif text-[56px] font-medium leading-none text-positive md:text-[68px]">
                  {champion.ret != null ? `${champion.ret >= 0 ? "+" : "−"}${Math.abs(Math.round(champion.ret))}%` : "—"}
                </div>
                <p className="mt-1.5 text-[13px] text-fg-muted">return over the test window · the strongest result that stayed inside your risk limit.</p>
                <blockquote className="mt-6 border-l-2 border-gold pl-4">
                  <span className="font-serif text-[16px] italic leading-relaxed text-fg-primary">
                    It returned the most of any setup that stayed inside your −{ddCap}% limit — {nFit} of {cells.length} runs qualified.
                  </span>
                  <span className="mt-1.5 block text-[13px] text-fg-secondary">{robust}</span>
                </blockquote>
              </div>
              <div>
                <span className="font-cap text-[10px] uppercase tracking-[0.14em] text-gold-deep">Deploy metrics</span>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Tile label="Return" value={champion.ret != null ? `${champion.ret >= 0 ? "+" : "−"}${Math.abs(Math.round(champion.ret))}%` : "—"} tone="pos" />
                  <Tile label="Max drawdown" value={champion.dd != null ? `−${Math.round(champion.dd)}%` : "—"} tone="neg" />
                  <Tile label="Sharpe" value={champion.sharpe != null ? champion.sharpe.toFixed(1) : "—"} />
                  <Tile label="Win rate" value={champion.win != null ? `${Math.round(champion.win)}%` : "—"} />
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 max-w-[640px]">
              <h1 className="font-serif text-[30px] font-medium text-fg-primary">No setup fits a −{ddCap}% limit</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-fg-secondary">
                Loosen the cap below, or sit this one out — there's no shame in waiting for a setup that fits your plan.
              </p>
            </div>
          )}

          {/* Cap slider (left) + actions (right) */}
          <div className="mt-7 grid gap-6 border-t border-border-subtle pt-6 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] text-fg-primary">How much fall can you live with?</span>
                <span className="text-[14px] text-fg-primary">cap at <b className="font-serif text-lg text-ink">{ddCap}</b>%</span>
              </div>
              <input type="range" min={8} max={25} step={1} value={ddCap} onChange={(e) => onCapChange(Number(e.target.value))} className="mt-3 w-full accent-ink" aria-label="Maximum drawdown cap percent" />
              <div className="mt-1.5 flex justify-between font-serif text-[11px] text-fg-muted"><span>−8% strict</span><span>−25% loose</span></div>
            </div>
            <div className="flex flex-wrap gap-2.5 lg:justify-end">
              <button type="button" onClick={openInLab} disabled={!champion} className={cn("inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-medium text-white", champion ? "bg-ink" : "bg-ink/40")}>
                <FlaskConical className="h-4 w-4" /> Open in Strategy Lab
              </button>
              <button type="button" onClick={saveDeployed} disabled={!champion} className="inline-flex items-center gap-2 rounded-[10px] border border-border-subtle px-4 py-2.5 text-sm font-medium text-fg-primary disabled:opacity-50">
                <Bookmark className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </section>

        {/* ============ MATRIX + SCATTER ============ */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Matrix */}
          <section className="rounded-2xl border border-border-subtle bg-card p-5 md:p-6">
            <div className="flex items-center justify-between">
              <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">The full grid · {run.tickers.length} × {run.strategyIds.length}</span>
              <div className="inline-flex overflow-hidden rounded-lg border border-border-subtle" role="group" aria-label="Recolor matrix by metric">
                {LENSES.map((l) => (
                  <button key={l.key} type="button" aria-pressed={lens === l.key} onClick={() => setLens(l.key)} className={cn("px-3 py-1.5 font-cap text-[10px] uppercase tracking-[0.1em]", lens === l.key ? "bg-ink text-white" : "text-fg-muted")}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-separate" style={{ borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <th />
                    {run.strategyIds.map((sid) => (
                      <th key={sid} className="pb-2 text-center align-bottom font-cap text-[10px] uppercase leading-tight tracking-[0.06em] text-gold-deep">
                        {strategyTitle(sid)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {run.tickers.map((sym) => (
                    <tr key={sym}>
                      <td className="whitespace-nowrap pr-3 text-right font-cap text-[12px] text-fg-secondary">{sym}</td>
                      {run.strategyIds.map((sid) => {
                        const key = cellKey(sym, sid);
                        const m = metricByKey.get(key);
                        const t = m ? goodness(m) : null;
                        const isChamp = champion && champion.symbol === sym && champion.strategyId === sid;
                        const isHover = hovered === key;
                        const dark = (t ?? 0) > 0.55;
                        return (
                          <td
                            key={sid}
                            onMouseEnter={() => setHovered(key)}
                            onMouseLeave={() => setHovered(null)}
                            className="relative h-[42px] cursor-pointer rounded-lg text-center font-serif text-[15px]"
                            style={{
                              background: t == null ? "rgba(228,222,207,0.4)" : rampColor(t),
                              color: dark ? "#F4F1EE" : "#33406A",
                              boxShadow: isHover ? `inset 0 0 0 2px ${GOLD}` : undefined,
                            }}
                          >
                            {m ? fmtLens(m, lens) : "—"}
                            {isChamp && <span className="absolute right-1.5 top-1 text-[11px]" style={{ color: dark ? GOLD : GOLD_DEEP }}>★</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-fg-muted">Darker is stronger · <span className="text-gold-deep">★</span> deploy pick · hover any cell to trace it across the page.</p>
          </section>

          {/* Scatter */}
          <section className="flex flex-col rounded-2xl border border-border-subtle bg-card p-5 md:p-6">
            <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Risk vs. return</span>
            <div className="mt-3 min-h-[260px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 6, right: 8, bottom: 6, left: -8 }}>
                  <CartesianGrid stroke={HAIR} />
                  <XAxis type="number" dataKey="x" reversed name="drawdown" unit="%" tick={{ fontSize: 10, fill: MUTED }} stroke={HAIR} label={{ value: "max drawdown %", position: "insideBottom", offset: -2, fontSize: 9, fill: GOLD_DEEP }} />
                  <YAxis type="number" dataKey="y" name="return" unit="%" tick={{ fontSize: 10, fill: MUTED }} stroke={HAIR} />
                  <Tooltip cursor={{ strokeDasharray: "3 3", stroke: HAIR }} content={<ScatterTip />} />
                  <Scatter data={scatterData} onMouseEnter={(p: { key?: string }) => p?.key && setHovered(p.key)} onMouseLeave={() => setHovered(null)}>
                    {scatterData.map((d) => {
                      const isChamp = champion && d.key === cellKey(champion.symbol, champion.strategyId);
                      const isHover = hovered === d.key;
                      return <RCell key={d.key} fill={isHover ? GOLD_DEEP : isChamp ? GOLD : "rgba(56,79,132,0.4)"} stroke={isChamp ? GOLD_DEEP : "transparent"} r={isHover ? 8 : isChamp ? 7 : 4.5} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[11px] text-fg-muted">Up and left is the sweet spot.</p>
          </section>
        </div>

        {/* ============ EQUITY CURVES ============ */}
        {equityKeys.length > 0 && (
          <section className="mt-5 rounded-2xl border border-border-subtle bg-card p-5 md:p-6">
            <div className="flex items-center justify-between">
              <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">How $100 would have grown</span>
              <span className="text-[11px] text-fg-muted">champion in navy, the field faded behind</span>
            </div>
            <div className="mt-3 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData} margin={{ top: 6, right: 12, bottom: 2, left: -8 }}>
                  <CartesianGrid stroke={HAIR} vertical={false} />
                  <XAxis dataKey="i" tick={{ fontSize: 10, fill: MUTED }} stroke={HAIR} tickFormatter={() => ""} />
                  <YAxis tick={{ fontSize: 10, fill: MUTED }} stroke={HAIR} domain={["auto", "auto"]} tickFormatter={(v) => `$${Math.round(v)}`} />
                  <Tooltip content={<EquityTip />} />
                  {equityKeys.map((k) => {
                    const isChamp = k === championEqKey;
                    const isHover = hovered === k;
                    return (
                      <Line
                        key={k}
                        type="monotone"
                        dataKey={k}
                        stroke={isHover ? GOLD_DEEP : isChamp ? INK : FADE}
                        strokeWidth={isHover ? 2.6 : isChamp ? 2.6 : 1}
                        dot={false}
                        activeDot={{ r: 3, onMouseOver: () => setHovered(k) }}
                        isAnimationActive={false}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ============ CONSISTENCY + TRADE ============ */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-border-subtle bg-card p-5 md:p-6">
            <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Strategy consistency</span>
            <div className="mt-5 space-y-5">
              {consistency.map((s) => {
                const span = sharpeDomain.hi - sharpeDomain.lo || 1;
                const pos = (v: number | null) =>
                  Math.max(0, Math.min(100, (((v ?? sharpeDomain.lo) - sharpeDomain.lo) / span) * 100));
                const l = pos(s.minSharpe);
                const r = pos(s.maxSharpe);
                const d = pos(s.avgSharpe);
                return (
                  <div key={s.strategyId} className="grid grid-cols-[140px_1fr_44px] items-center gap-4">
                    <span className="truncate text-[13px] text-fg-primary">{s.strategyTitle}</span>
                    <div className="relative h-4">
                      <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border-subtle" />
                      <span className="absolute top-1/2 h-px -translate-y-1/2 bg-gold" style={{ left: `${l}%`, width: `${Math.max(0, r - l)}%` }} />
                      <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${d}%` }} />
                    </div>
                    <span className="text-right font-serif text-[15px] text-ink">{s.avgSharpe != null ? s.avgSharpe.toFixed(2) : "—"}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-fg-muted">Dot = avg Sharpe across tickers; whisker = its range.</p>
          </section>

          {champion && (
            <section className="rounded-2xl border border-border-subtle bg-card p-5 md:p-6">
              <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">How the champion actually traded</span>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <TB label="Avg hold" value={trade.avgHold != null ? `${trade.avgHold}` : "—"} unit={trade.avgHold != null ? " days" : ""} />
                <TB label="Trades" value={trade.trades != null ? `${trade.trades}` : "—"} />
                <TB label="Win / loss" value={trade.winLoss != null ? `${trade.winLoss.toFixed(1)}×` : "—"} />
              </div>
              {trade.exit && (
                <div className="mt-6">
                  <span className="font-cap text-[10px] uppercase tracking-[0.1em] text-fg-muted">How positions closed</span>
                  <div className="mt-2 flex h-2.5 overflow-hidden rounded border border-border-subtle">
                    <span style={{ width: `${trade.exit.target}%`, background: "#3F7D5B" }} />
                    <span style={{ width: `${trade.exit.stop}%`, background: "#B0573F" }} />
                    <span style={{ width: `${trade.exit.other}%`, background: GOLD }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-muted">
                    <span>Hit target {trade.exit.target}%</span>
                    <span>Stopped out {trade.exit.stop}%</span>
                    <span>Other {trade.exit.other}%</span>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ============ LEADERBOARD ============ */}
        <section className="mt-5 rounded-2xl border border-border-subtle bg-card p-5 md:p-6">
          <span className="font-cap text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Top six by return</span>
          <table className="mt-3 w-full">
            <thead>
              <tr className="font-cap text-[9px] uppercase tracking-[0.08em] text-gold-deep">
                <th className="pb-2 text-left font-medium">#</th>
                <th className="pb-2 text-left font-medium">Config</th>
                <th className="pb-2 text-right font-medium">Return</th>
                <th className="pb-2 text-right font-medium">Sharpe</th>
                <th className="pb-2 text-right font-medium">Max DD</th>
                <th className="pb-2 text-right font-medium">Win</th>
                <th className="pb-2 text-right font-medium">Trades</th>
              </tr>
            </thead>
            <tbody>
              {board.map((m, i) => {
                const key = cellKey(m.symbol, m.strategyId);
                return (
                  <tr
                    key={key}
                    onMouseEnter={() => setHovered(key)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn("cursor-pointer font-serif text-[13px]", hovered === key ? "bg-ink/10" : i === 0 ? "bg-gold/15" : "")}
                  >
                    <td className="border-t border-border-subtle py-2 text-left text-fg-muted">{i + 1}</td>
                    <td className="border-t border-border-subtle py-2 text-left font-sans text-[12px]">{m.strategyTitle} · {m.symbol}</td>
                    <td className="border-t border-border-subtle py-2 text-right text-positive">{m.ret != null ? `+${Math.round(m.ret)}%` : "—"}</td>
                    <td className="border-t border-border-subtle py-2 text-right">{m.sharpe != null ? m.sharpe.toFixed(1) : "—"}</td>
                    <td className="border-t border-border-subtle py-2 text-right text-negative">{m.dd != null ? `−${Math.round(m.dd)}%` : "—"}</td>
                    <td className="border-t border-border-subtle py-2 text-right">{m.win != null ? `${Math.round(m.win)}%` : "—"}</td>
                    <td className="border-t border-border-subtle py-2 text-right">{m.trades ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <p className="mx-2 mb-1 mt-5 text-center font-serif text-[11px] italic leading-relaxed text-fg-muted">
          Remember why you invest. A backtest is a rehearsal, not a promise.
        </p>
      </main>
      <Footer />
    </div>
  );
};

function Tile({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-sunken/30 px-4 py-3.5">
      <span className="font-cap text-[10px] uppercase tracking-[0.1em] text-gold-deep">{label}</span>
      <div className={cn("mt-1 font-serif text-[26px] font-medium leading-none", tone === "pos" ? "text-positive" : tone === "neg" ? "text-negative" : "text-fg-primary")}>{value}</div>
    </div>
  );
}

function TB({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <span className="font-cap text-[10px] uppercase tracking-[0.1em] text-gold-deep">{label}</span>
      <div className="mt-1 font-serif text-[24px] font-medium leading-none text-fg-primary">{value}<span className="text-[13px] text-fg-muted">{unit}</span></div>
    </div>
  );
}

interface TipPayload {
  payload?: { key?: string; label?: string; x?: number; y?: number };
}
function ScatterTip({ active, payload }: { active?: boolean; payload?: TipPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  return (
    <div className="rounded-lg bg-fg-primary px-3 py-2 text-[11px] text-white shadow">
      <div className="font-serif text-[13px]">{p.label}</div>
      <div>Return +{p.y}% · DD −{p.x}%</div>
    </div>
  );
}

function EquityTip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number }>; label?: string | number }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null).slice(0, 4);
  return (
    <div className="rounded-lg bg-fg-primary px-3 py-2 text-[11px] text-white shadow">
      {rows.map((r) => (
        <div key={r.dataKey}>{(r.dataKey ?? "").replace("|", " · ")}: ${Math.round(r.value ?? 0)}</div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Derivations kept out of render.
// ---------------------------------------------------------------------------

function championRobustness(champion: CellMetrics | null, consistency: ReturnType<typeof strategyConsistency>): string {
  if (!champion) return "";
  const rank = consistency.findIndex((c) => c.strategyId === champion.strategyId) + 1;
  if (rank === 1) return `And it leans on ${champion.strategyTitle} — your steadiest edge across tickers. A reassuring sign, not a guarantee.`;
  if (rank > 1) return `But ${champion.strategyTitle} is your #${rank} edge for consistency — it shone here, so size in with care.`;
  return "Confirm it holds up before you size in.";
}

interface TradeStats {
  avgHold: number | null;
  trades: number | null;
  winLoss: number | null;
  exit: { target: number; stop: number; other: number } | null;
}

function deriveTradeStats(cell: SavedBatchCell | null): TradeStats {
  const r = cell?.result;
  if (!r) return { avgHold: null, trades: null, winLoss: null, exit: null };
  const trades = r.trades ?? [];
  const holds = trades.map((t) => t.holding_days).filter((h): h is number => typeof h === "number");
  const avgHold = holds.length ? Math.round(holds.reduce((a, b) => a + b, 0) / holds.length) : null;
  const wins = r.winning_trades ?? trades.filter((t) => (t.pnl ?? 0) > 0).length;
  const losses = r.losing_trades ?? trades.filter((t) => (t.pnl ?? 0) < 0).length;
  const winLoss = losses > 0 ? wins / losses : wins > 0 ? wins : null;

  let exit: TradeStats["exit"] = null;
  if (trades.length) {
    let target = 0, stop = 0, other = 0;
    for (const t of trades) {
      const reason = (t.exit_reason ?? "").toLowerCase();
      if (reason.includes("profit") || reason.includes("target")) target++;
      else if (reason.includes("stop")) stop++;
      else other++;
    }
    const total = trades.length;
    exit = {
      target: Math.round((target / total) * 100),
      stop: Math.round((stop / total) * 100),
      other: Math.round((other / total) * 100),
    };
  }
  return { avgHold, trades: r.total_trades ?? trades.length ?? null, winLoss, exit };
}

/** Overlay the top runs' equity curves, each normalized to start = 100, aligned by index. */
function buildEquityOverlay(
  cells: SavedBatchCell[],
  board: CellMetrics[],
  champion: CellMetrics | null,
): { equityData: Array<Record<string, number>>; equityKeys: string[]; championEqKey: string | null } {
  const top = board.slice(0, 8);
  const series: { key: string; values: number[] }[] = [];
  for (const m of top) {
    const cell = cells.find((c) => c.symbol === m.symbol && c.strategyId === m.strategyId);
    const curve = cell?.result?.equity_curve;
    if (!curve || curve.length < 2 || !curve[0]) continue;
    series.push({ key: cellKey(m.symbol, m.strategyId), values: curve.map((v) => (v / curve[0]) * 100) });
  }
  if (!series.length) return { equityData: [], equityKeys: [], championEqKey: null };
  const maxLen = Math.max(...series.map((s) => s.values.length));
  const equityData: Array<Record<string, number>> = [];
  for (let i = 0; i < maxLen; i++) {
    const point: Record<string, number> = { i };
    for (const s of series) {
      if (i < s.values.length) point[s.key] = Math.round(s.values[i] * 10) / 10;
    }
    equityData.push(point);
  }
  const championEqKey = champion ? cellKey(champion.symbol, champion.strategyId) : null;
  return { equityData, equityKeys: series.map((s) => s.key), championEqKey };
}

export default BatchAnalytics;
