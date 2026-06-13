import { ArrowRight, Check, Compass, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const trust = ["Free to start", "No credit card", "Purpose-first"];

const bars = [
  { h: 40, c: "bg-gold-tertiary" },
  { h: 52, c: "bg-gold-tertiary" },
  { h: 46, c: "bg-gold-tertiary" },
  { h: 64, c: "bg-gold-tertiary" },
  { h: 58, c: "bg-gold-tertiary" },
  { h: 72, c: "bg-gold-tertiary" },
  { h: 68, c: "bg-gold-tertiary" },
  { h: 84, c: "bg-gold-deep" },
  { h: 78, c: "bg-gold-deep" },
  { h: 92, c: "bg-gold-deep" },
];

const Hero = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const registerTo = user ? "/dashboard" : "/auth";

  return (
    <section className="relative overflow-hidden bg-surface-primary">
      <div
        className="pointer-events-none absolute -right-32 top-20 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--accent) / 0.35), transparent 70%)" }}
        aria-hidden
      />

      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-20 px-6 pb-24 pt-20 md:px-12 md:pb-32 md:pt-28 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 lg:max-w-[560px]">
          <p className="landing-fade-up font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">
            Purpose-driven investing
          </p>
          <h1
            className="landing-fade-up mt-6 font-serif text-[44px] font-medium leading-[1.06] text-fg-primary md:text-[56px]"
            style={{ animationDelay: "80ms" }}
          >
            Invest with clarity.
            <span className="mt-2 block text-fg-secondary">Not with noise.</span>
          </h1>
          <p
            className="landing-fade-up mt-7 max-w-[480px] text-[18px] leading-relaxed text-fg-secondary"
            style={{ animationDelay: "160ms" }}
          >
            TradLyte helps you discover ideas, backtest strategies, and track growth from your own entry — all
            anchored to what matters in your life.
          </p>

          <div
            className="landing-fade-up mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              to={registerTo}
              className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              {user ? "Go to dashboard" : "Create free account"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-full border border-border-strong bg-card px-7 py-4 text-base font-semibold text-fg-primary transition-colors hover:bg-surface-sunken"
            >
              See how it works
            </a>
          </div>

          <div
            className="landing-fade-up mt-10 flex flex-wrap gap-x-8 gap-y-3"
            style={{ animationDelay: "320ms" }}
          >
            {trust.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-positive" />
                <span className="text-sm font-medium text-fg-muted">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative w-full max-w-[480px] flex-shrink-0 lg:max-w-[520px]">
          <button
            type="button"
            onClick={() => navigate("/stock/NVDA")}
            className="landing-float landing-fade-up w-full rounded-3xl border border-border-subtle bg-card p-8 text-left shadow-elegant transition-transform hover:-translate-y-1"
            style={{ animationDelay: "400ms" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-serif text-3xl font-semibold text-fg-primary">NVDA</div>
                <div className="mt-1 text-sm text-fg-muted">Today's pick · Semiconductors</div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-3 py-1.5 font-cap text-xs font-semibold text-positive">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                +12.4% since pick
              </span>
            </div>

            <div className="mt-8 flex h-28 items-end gap-2">
              {bars.map((b, i) => (
                <div
                  key={i}
                  className={`landing-grow-bar flex-1 rounded-sm ${b.c}`}
                  style={{ height: b.h, animationDelay: `${500 + i * 60}ms` }}
                />
              ))}
            </div>

            <div className="mt-8 flex items-end justify-between border-t border-border-subtle pt-6">
              <div>
                <div className="font-cap text-xs text-fg-muted">Portfolio growth</div>
                <div className="mt-1 font-serif text-3xl font-medium text-fg-primary">+18.4%</div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-positive">
                <TrendingUp className="h-4 w-4" />
                Since your entry
              </span>
            </div>
          </button>

          <div
            className="landing-float-delayed absolute -bottom-6 left-6 right-6 rounded-2xl bg-surface-inverse p-5 shadow-elegant md:left-auto md:right-[-12px] md:w-[260px]"
            style={{ animationDelay: "700ms" }}
          >
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-gold" />
              <span className="font-cap text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
                Purpose check
              </span>
            </div>
            <p className="mt-2 font-serif text-lg leading-snug text-white">
              Does this fit your why before you buy?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
