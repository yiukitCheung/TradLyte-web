import { ArrowRight, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/Reveal";

const strategies = [
  { id: "momentum", name: "Momentum Rider", risk: "Moderate", return: "+142%", desc: "Ride strength while trends last." },
  { id: "golden", name: "Golden Cross", risk: "Low", return: "+88%", desc: "Classic trend following on moving averages." },
  { id: "mean", name: "Mean Reversion", risk: "Moderate", return: "+96%", desc: "Buy dips with RSI and pattern signals." },
];

const riskChip: Record<string, string> = {
  Low: "bg-positive-soft text-positive",
  Moderate: "bg-gold/20 text-gold-deep",
  High: "bg-negative-soft text-negative",
};

const TradlyteSelect = () => (
  <section id="tradlyte-select" className="border-y border-border-subtle bg-surface-sunken/80">
    <div className="mx-auto w-full max-w-[1100px] px-6 py-28 md:px-12 md:py-36">
      <Reveal className="max-w-2xl">
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
        {strategies.map((s, i) => (
          <Reveal key={s.id} delay={i * 100}>
            <div className="flex flex-col gap-6 rounded-3xl border border-border-subtle bg-card p-8 md:flex-row md:items-center md:justify-between md:p-10">
              <div className="flex flex-col gap-4 md:max-w-lg">
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-3 py-1 font-cap text-xs font-semibold", riskChip[s.risk])}>
                    {s.risk} risk
                  </span>
                  <Activity className="h-4 w-4 text-fg-muted" />
                </div>
                <h3 className="font-serif text-2xl font-medium text-fg-primary">{s.name}</h3>
                <p className="text-[16px] leading-relaxed text-fg-secondary">{s.desc}</p>
              </div>
              <div className="flex items-end justify-between gap-8 md:flex-col md:items-end">
                <div className="text-right md:text-right">
                  <div className="font-cap text-xs text-fg-muted">Sample backtest</div>
                  <div className="font-serif text-3xl font-medium text-positive">{s.return}</div>
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
        ))}
      </div>

      <Reveal delay={200} className="mt-16 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[15px] text-fg-muted">
          Register free to run backtests on your own symbols and save your strategies.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Register to backtest
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Reveal>
    </div>
  </section>
);

export default TradlyteSelect;
