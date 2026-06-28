import { useEffect, useState } from "react";
import { ArrowRight, Compass, FlaskConical, LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { StoryFrame } from "./StoryVisual";
import { useScrollProgress } from "@/hooks/useScrollProgress";

const steps = [
  {
    icon: Compass,
    kicker: "01",
    title: "Know your why",
    body: "Set a purpose and goals so every trade connects to your life — not to a headline.",
  },
  {
    icon: FlaskConical,
    kicker: "02",
    title: "Test your idea",
    body: "Build a strategy in plain language and replay it on real market history before you risk a dollar.",
  },
  {
    icon: LineChart,
    kicker: "03",
    title: "Track with calm",
    body: "Follow growth from your entry price, journal your thinking, and pause when emotions run hot.",
  },
];

const Intro = () => (
  <Reveal className="mx-auto max-w-2xl text-center">
    <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">How it works</p>
    <h2 className="mt-5 font-serif text-[34px] font-medium leading-tight text-fg-primary md:text-[44px]">
      Learn the platform in three quiet steps
    </h2>
    <p className="mt-5 text-[17px] leading-relaxed text-fg-secondary">
      No jargon wall. Start with intention, prove your idea with data, then invest with a clearer head.
    </p>
  </Reveal>
);

const ClosingCta = () => (
  <Reveal delay={120} className="mt-24 flex flex-col items-center gap-5 text-center">
    <Link
      to="/auth"
      className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-9 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
    >
      Create your free account
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
    <p className="font-cap text-sm text-fg-muted">Free to start · No credit card</p>
  </Reveal>
);

const StepCopy = ({
  step,
  active,
}: {
  step: (typeof steps)[number];
  active: boolean;
}) => {
  const Icon = step.icon;
  return (
    <div className={cn("transition-opacity duration-500", active ? "opacity-100" : "opacity-40")}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors duration-500",
            active
              ? "border-gold bg-gold/10 text-gold-deep"
              : "border-border-subtle bg-card text-fg-muted",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-cap text-xs uppercase tracking-[0.18em] text-gold-deep">
          {step.kicker}
        </span>
      </div>
      <h3
        className={cn(
          "mt-4 font-serif text-2xl font-medium transition-colors duration-500 md:text-[28px]",
          active ? "text-fg-primary" : "text-fg-secondary",
        )}
      >
        {step.title}
      </h3>
      <p className="mt-3 max-w-md text-[16px] leading-relaxed text-fg-secondary">{step.body}</p>
    </div>
  );
};

const HowItWorks = () => {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const active = Math.min(steps.length - 1, Math.floor(progress * steps.length));

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  // Reduced motion: plain stacked steps, every frame shown statically (no pin).
  if (reduced) {
    return (
      <section id="how-it-works" className="bg-surface-primary">
        <div className="mx-auto w-full max-w-[1100px] px-6 py-28 md:px-12 md:py-36">
          <Intro />
          <div className="mt-20 flex flex-col gap-24">
            {steps.map((step, i) => (
              <div key={step.title} className="grid items-center gap-10 md:grid-cols-2">
                <StepCopy step={step} active />
                <div className="h-[360px]">
                  <StoryFrame index={i} />
                </div>
              </div>
            ))}
          </div>
          <ClosingCta />
        </div>
      </section>
    );
  }

  return (
    <section id="how-it-works" className="bg-surface-primary">
      <div className="mx-auto w-full max-w-[1100px] px-6 pt-28 md:px-12 md:pt-36">
        <Intro />
      </div>

      {/* Tall track: scrolling through it drives the pinned stage below. */}
      <div ref={ref} className="relative" style={{ height: "300vh" }}>
        <div className="sticky top-0 flex min-h-screen items-center">
          <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-2 lg:gap-16">
            {/* Steps + progress rail */}
            <div className="flex gap-6">
              <div className="relative hidden w-[3px] shrink-0 overflow-hidden rounded-full bg-border-subtle sm:block">
                <div
                  className="absolute left-0 top-0 w-full rounded-full bg-gold-deep"
                  style={{ height: `${progress * 100}%` }}
                />
              </div>
              <div className="flex flex-1 flex-col gap-8">
                {steps.map((step, i) => (
                  <StepCopy key={step.title} step={step} active={i === active} />
                ))}
              </div>
            </div>

            {/* Morphing visual */}
            <div className="relative h-[360px] sm:h-[420px]">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    opacity: i === active ? 1 : 0,
                    transform:
                      i === active ? "translateY(0) scale(1)" : "translateY(16px) scale(0.98)",
                    pointerEvents: i === active ? "auto" : "none",
                  }}
                >
                  <StoryFrame index={i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1100px] px-6 pb-28 md:px-12 md:pb-36">
        <ClosingCta />
      </div>
    </section>
  );
};

export default HowItWorks;
