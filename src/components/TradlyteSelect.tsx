import { ArrowRight, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/Reveal";
import { FEATURED_STRATEGIES, SNAPSHOT_AS_OF } from "@/lib/landingSnapshot";

// Risk + one-liner per featured strategy (keyed by snapshot `key`). The numbers
// themselves come from FEATURED_STRATEGIES — real backtests, regenerated via
// `npm run snapshot:landing`.
const META: Record<string, { risk: string; desc: string }> = {
  momentum: { risk: "Moderate", desc: "Ride strength while the trend lasts (fast EMA cross)." },
  golden: { risk: "Low", desc: "Classic trend following on moving-average crosses." },
  mean: { risk: "Moderate", desc: "Buy deeply oversold dips on an RSI signal." },
};

const riskChip: Record<string, string> = {
  Low: "bg-positive-soft text-positive",
  Moderate: "bg-gold/20 text-gold-deep",
  High: "bg-negative-soft text-negative",
};

const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;

const TradlyteSelect = () => (
  <section id="tradlyte-select" className="border-y border-border-subtle bg-surface-sunken/80">
    <div className="mx-auto w-full max-w-[1100px] px-6 py-28 md:px-12 md:py-36">
      <Reveal stagger={90} className="max-w-2xl">
        <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">Strategy Lab preview</p>
        <h2 className="mt-5 font-serif text-[34px] font-medium leading-tight text-fg-primary md:text-[44px]">
          Test ideas before you trust them.
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-fg-secondary">
          Start from a recipe, walk through three guided steps, and see how your strategy would have performed on
          real history.
        </p>
      </Reveal>

      <div className="mt-16 flex flex-col gap-5">
        {FEATURED_STRATEGIES.map((s, i) => {
          const meta = META[s.key] ?? { risk: "Moderate", desc: "" };
          return (
            <Reveal key={s.key} delay={i * 100}>
              <div className="flex flex-col gap-6 rounded-3xl border border-border-subtle bg-card p-8 md:flex-row md:items-center md:justify-between md:p-10">
                <div className="flex flex-col gap-4 md:max-w-lg">
                  <div className="flex items-center gap-3">
                    <span className={cn("rounded-full px-3 py-1 font-cap text-xs font-semibold", riskChip[meta.risk])}>
                      {meta.risk} risk
                    </span>
                    <Activity className="h-4 w-4 text-fg-muted" />
                  </div>
                  <h3 className="font-serif text-2xl font-medium text-fg-primary">{s.strategyTitle}</h3>
                  <p className="text-[16px] leading-relaxed text-fg-secondary">{meta.desc}</p>
                </div>
                <div className="flex items-end justify-between gap-8 md:flex-col md:items-end">
                  <div className="md:text-right">
                    <div className="font-cap text-xs text-fg-muted">Real backtest</div>
                    <div
                      className={cn(
                        "font-serif text-3xl font-medium",
                        s.totalReturnPct >= 0 ? "text-positive" : "text-negative",
                      )}
                    >
                      {fmtPct(s.totalReturnPct)}
                    </div>
                    <div className="mt-1 font-cap text-[11px] uppercase tracking-[0.1em] text-fg-muted">
                      {s.symbol} · {s.periodLabel} · {s.totalTrades} trades
                    </div>
                  </div>
                  <Link
                    to="/strategy-builder"
                    className="inline-flex items-center gap-2 font-cap text-sm font-semibold text-ink hover:text-gold-deep"
                  >
                    Try in Strategy Lab <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={200} className="mt-16 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[15px] text-fg-muted">
          Real backtests on real history, snapshotted {SNAPSHOT_AS_OF}. Register free to run them on your own
          symbols and save your strategies.
        </p>
        <Link
          to="/auth"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Register to backtest
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </div>
  </section>
);

export default TradlyteSelect;
