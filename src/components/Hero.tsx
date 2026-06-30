import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HeroAnimation from "@/components/landing/HeroAnimation";

// Why we're different from other financial-analytics platforms — purpose, not
// dopamine; signal, not a ticker firehose; a companion that guides but never trades.
const differentiators = [
  "Purpose over profit — every move tied to your goals",
  "Signal over noise — not another thousand-ticker firehose",
  "We guide, never trade — analyze & backtest, not a brokerage",
];

const Hero = () => {
  const { user } = useAuth();
  const registerTo = user ? "/dashboard" : "/auth";

  return (
    <section
      id="hero-root"
      className="hero-dark relative -mt-16 flex min-h-screen items-center overflow-hidden bg-[hsl(var(--hero-bg))] text-[hsl(var(--hero-text))]"
    >
      {/* Full-bleed hero animation — the bold living background. */}
      <div className="absolute inset-0" aria-hidden>
        <HeroAnimation />
      </div>

      {/* Legibility scrims over the animation so the copy stays readable.
          Horizontal: darkens the left where the copy lives (desktop).
          Vertical (mobile only): darkens the top where the copy stacks. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--hero-bg)) 0%, hsl(var(--hero-bg) / 0.92) 30%, hsl(var(--hero-bg) / 0.5) 52%, transparent 78%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 lg:hidden"
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--hero-bg) / 0.93) 0%, hsl(var(--hero-bg) / 0.66) 45%, hsl(var(--hero-bg) / 0.55) 100%)",
        }}
        aria-hidden
      />

      {/* Content — overlaid, left-weighted safe zone. */}
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 py-24 md:px-12 md:py-28">
        <div className="max-w-[560px]">
          <p className="landing-fade-up font-cap text-sm uppercase tracking-[0.18em] text-[hsl(var(--hero-gold))]">
            Your purpose-driven investing companion
          </p>
          <h1
            className="landing-fade-up mt-6 font-serif text-[40px] font-medium leading-[1.05] md:text-[58px]"
            style={{ animationDelay: "80ms" }}
          >
            Markets are loud.
            <span className="mt-2 block italic text-[hsl(var(--hero-gold))]">
              Your plan stays clear.
            </span>
          </h1>
          <p
            className="landing-fade-up mt-7 max-w-[460px] text-[17px] leading-relaxed text-[hsl(var(--hero-muted))]"
            style={{ animationDelay: "160ms" }}
          >
            TradLyte turns market noise into a simple, purpose-tied plan — discover
            and backtest ideas without code, then track every step from your own
            entry price. We help you decide, not trade for you.
          </p>

          <div
            className="landing-fade-up mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              to={registerTo}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[hsl(var(--hero-gold))] px-8 py-4 text-base font-semibold text-[hsl(222_45%_11%)] shadow-[0_8px_28px_hsl(var(--hero-gold)/0.25)] transition-transform hover:-translate-y-0.5"
            >
              {user ? "Go to dashboard" : "Filter the Noise"}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-full border border-white/20 px-7 py-4 text-base font-semibold text-[hsl(var(--hero-text))] backdrop-blur-sm transition-colors hover:bg-white/5"
            >
              See how it works
            </a>
          </div>

          <div
            className="landing-fade-up mt-10 flex flex-col gap-y-3"
            style={{ animationDelay: "320ms" }}
          >
            {differentiators.map((t) => (
              <div key={t} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 flex-none text-[hsl(var(--hero-gold))]" />
                <span className="text-sm font-medium text-[hsl(var(--hero-muted))]">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
