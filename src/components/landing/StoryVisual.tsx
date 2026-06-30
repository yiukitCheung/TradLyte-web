import { Target, FlaskConical, LineChart, Check, Zap, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANDING_BACKTEST } from "@/lib/landingSnapshot";
import { useTopPickReturn } from "@/hooks/useTopPickReturn";

/**
 * The four morphing frames for the pinned "How it works" narrative.
 *   0 — Know your why    (purpose / goals — illustrative example, labelled)
 *   1 — Test your idea    (a REAL snapshotted Strategy Lab backtest, no code)
 *   2 — Run it automatically (the plan runs on its own — TradLyte WATCHES + ALERTS;
 *                            it never trades for you, so the card says so explicitly)
 *   3 — Track with calm   (a REAL live public top pick + 21d trailing return)
 */

const cardBase =
  "flex h-full w-full flex-col rounded-3xl border border-border-subtle bg-card p-8 shadow-elegant md:p-10";

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

const goals = [
  { label: "Family home fund", pct: 64 },
  { label: "Travel & freedom", pct: 42 },
];

const PurposeCard = () => (
  <div className={cardBase}>
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Target className="h-5 w-5 text-gold-deep" />
        <h3 className="font-serif text-2xl font-medium text-fg-primary">Know your why</h3>
      </div>
      <span className="rounded-full border border-border-subtle bg-surface-sunken px-2.5 py-1 font-cap text-[10px] uppercase tracking-[0.12em] text-fg-muted">
        Example
      </span>
    </div>
    <p className="mt-3 text-sm text-fg-secondary">
      Every position tied to a real-life goal — not a headline.
    </p>
    <div className="mt-8 flex flex-col gap-6">
      {goals.map((g) => (
        <div key={g.label} className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-fg-primary">{g.label}</span>
            <span className="text-fg-muted">{g.pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-2 rounded-full bg-gold-deep" style={{ width: `${g.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const BacktestCard = () => {
  const b = LANDING_BACKTEST;
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-3">
        <FlaskConical className="h-5 w-5 text-gold-deep" />
        <h3 className="font-serif text-2xl font-medium text-fg-primary">Test your idea</h3>
      </div>
      <p className="mt-3 text-sm text-fg-secondary">
        A real backtest — replay a plain-language strategy on actual market history.
      </p>
      <div className="relative mt-8 flex-1 overflow-hidden rounded-2xl bg-surface-sunken/60 p-5">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="font-serif text-[40px] font-medium leading-none text-fg-primary">
              {fmtPct(b.totalReturnPct)}
            </div>
            <div className="mt-2 text-sm font-medium text-fg-primary">{b.strategyTitle}</div>
            <div className="text-xs text-fg-muted">
              {b.symbol} · backtested {b.periodLabel}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-positive-soft px-3 py-1 font-cap text-xs font-semibold text-positive">
            Real backtest
          </span>
        </div>
        <div className="relative z-10 mt-4 font-cap text-[11px] uppercase tracking-[0.12em] text-fg-muted">
          {Math.round(b.winRate * 100)}% win · {b.totalTrades} trades
        </div>
        <svg
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full opacity-70"
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="signal-draw"
            pathLength={1}
            d="M0,26 L20,20 L40,22 L60,12 L80,15 L100,3"
            fill="none"
            stroke="hsl(var(--accent-deep))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
};

const TrackCard = () => {
  const { status, data } = useTopPickReturn();
  return (
    <div className={cardBase}>
      <div className="flex items-center gap-3">
        <LineChart className="h-5 w-5 text-gold-deep" />
        <h3 className="font-serif text-2xl font-medium text-fg-primary">Track with calm</h3>
      </div>
      <p className="mt-3 text-sm text-fg-secondary">
        Track real growth on a live market pick — not the market's daily noise.
      </p>

      <div className="mt-8 rounded-2xl border border-border-subtle bg-surface-sunken/50 p-5">
        <div className="flex items-center justify-between">
          <span className="font-cap text-[11px] uppercase tracking-[0.14em] text-fg-muted">
            Today's top pick · 21-day return
          </span>
          {status === "ready" && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-positive">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              live
            </span>
          )}
        </div>

        <div className="mt-4 min-h-[44px]">
          {status === "loading" && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-24 animate-pulse rounded-lg bg-border-subtle" />
              <div className="h-7 w-20 animate-pulse rounded-lg bg-border-subtle" />
            </div>
          )}
          {status === "error" && (
            <p className="text-sm text-fg-muted">Live pick data is unavailable right now.</p>
          )}
          {status === "ready" && data && (
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-3xl font-medium text-fg-primary">{data.symbol}</span>
              {data.ret21d != null ? (
                <span
                  className={cn(
                    "font-serif text-2xl font-medium",
                    data.ret21d >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {fmtPct(data.ret21d)}
                </span>
              ) : (
                <span className="text-sm text-fg-muted">live · return updating</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface-sunken/50 px-4 py-3">
        <Check className="h-4 w-4 text-positive" />
        <span className="text-sm text-fg-secondary">
          Growth from your entry — journaled, so you stay honest.
        </span>
      </div>
    </div>
  );
};

const ExecuteCard = () => (
  <div className={cardBase}>
    <div className="flex items-center gap-3">
      <Zap className="h-5 w-5 text-gold-deep" />
      <h3 className="font-serif text-2xl font-medium text-fg-primary">Run it automatically</h3>
    </div>
    <p className="mt-3 text-sm text-fg-secondary">
      Set your plan once — TradLyte watches the market and pings you the moment it triggers.
    </p>

    <div className="mt-8 flex flex-col gap-3">
      {/* the rule, running on its own */}
      <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-sunken/60 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-fg-primary">Fast EMA Cross</span>
          <span className="font-cap text-[11px] uppercase tracking-[0.12em] text-fg-muted">
            watching · GOOG
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-positive">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          live
        </span>
      </div>
      {/* the alert it fires — a signal, not a trade */}
      <div className="flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
        <BellRing className="h-4 w-4 text-gold-deep" />
        <span className="text-sm text-fg-secondary">Signal sent — your conditions just hit.</span>
      </div>
    </div>

    {/* the honest boundary: TradLyte is a companion, not a brokerage */}
    <p className="mt-auto pt-5 font-cap text-[11px] uppercase tracking-[0.12em] text-fg-muted">
      We alert — you decide. TradLyte never trades for you.
    </p>
  </div>
);

export function StoryFrame({ index }: { index: number }) {
  if (index === 0) return <PurposeCard />;
  if (index === 1) return <BacktestCard />;
  if (index === 2) return <ExecuteCard />;
  return <TrackCard />;
}
