import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HeroAnimation from "@/components/landing/HeroAnimation";

const trust = ["Free to start", "No credit card", "Purpose-first"];

const Hero = () => {
  const { user } = useAuth();
  const registerTo = user ? "/dashboard" : "/auth";

  return (
    <section
      id="hero-root"
      className="hero-dark relative -mt-16 overflow-hidden bg-[hsl(var(--hero-bg))] text-[hsl(var(--hero-text))]"
    >
      {/* Soft depth glow behind the animation, weighted to the upper-right. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 82% 8%, hsl(var(--hero-bg-2)), transparent 58%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-12 px-6 pb-20 pt-16 md:px-12 md:pb-28 md:pt-24 lg:grid-cols-[minmax(0,44%)_minmax(0,56%)] lg:gap-14">
        {/* Copy — the legible safe zone */}
        <div className="lg:max-w-[520px]">
          <p className="landing-fade-up font-cap text-sm uppercase tracking-[0.18em] text-[hsl(var(--hero-gold))]">
            AI-driven clarity
          </p>
          <h1
            className="landing-fade-up mt-6 font-serif text-[40px] font-medium leading-[1.05] md:text-[54px]"
            style={{ animationDelay: "80ms" }}
          >
            Step off the rollercoaster.
            <span className="mt-2 block italic text-[hsl(var(--hero-gold))]">
              Into the plan.
            </span>
          </h1>
          <p
            className="landing-fade-up mt-7 max-w-[460px] text-[17px] leading-relaxed text-[hsl(var(--hero-muted))]"
            style={{ animationDelay: "160ms" }}
          >
            One glance instead of a thousand tickers. TradLyte filters the noise,
            automates your risk, and gives you the clarity to invest with purpose.
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
              className="inline-flex items-center rounded-full border border-white/20 px-7 py-4 text-base font-semibold text-[hsl(var(--hero-text))] transition-colors hover:bg-white/5"
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
                <Check className="h-4 w-4 text-[hsl(var(--hero-gold))]" />
                <span className="text-sm font-medium text-[hsl(var(--hero-muted))]">
                  {t}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Animation — weighted right, never under the text on desktop */}
        <div
          className="landing-fade-up relative h-[260px] w-full sm:h-[320px] lg:h-[440px]"
          style={{ animationDelay: "200ms" }}
        >
          <HeroAnimation />
        </div>
      </div>
    </section>
  );
};

export default Hero;
