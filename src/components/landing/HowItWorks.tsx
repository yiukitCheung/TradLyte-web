import { useEffect, useState, type CSSProperties } from "react";
import { ArrowRight, Compass, FlaskConical, LineChart, Zap } from "lucide-react";
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
    body: "Set a purpose and goals so every position connects to your life — not to a headline.",
  },
  {
    icon: FlaskConical,
    kicker: "02",
    title: "Test your idea",
    body: "Build a strategy in plain language — no code — and replay it on real market history before you risk a dollar.",
  },
  {
    icon: Zap,
    kicker: "03",
    title: "Run it automatically",
    body: "Set your plan once. TradLyte watches the market and alerts you the moment it triggers — you stay in control of the trade.",
  },
  {
    icon: LineChart,
    kicker: "04",
    title: "Track with calm",
    body: "Your plan's already proven on history, so you follow real growth from your entry price — and ignore the daily noise.",
  },
];

/* ---------------------------------------------------------------------------
   Dawn transition — the section opens DARK (continuing the hero's night) and
   lights up gradually as the reader scrolls through the three steps, ending on
   the app's normal light surface. Colors are lerped in RGB (a clean dusk→day
   ramp; HSL would swing through muddy mid-hues) and exposed as CSS custom
   properties on the section root, so every child just reads var(--hiw-*). Each
   var carries a LIGHT fallback so the reduced-motion (static) branch — which
   never sets these vars — renders correctly on the light surface.
   --------------------------------------------------------------------------- */
type RGB = readonly [number, number, number];
const NIGHT = {
  bg: [13, 17, 27] as RGB, // continues --hero-bg (222 33% 7%)
  fg: [243, 240, 234] as RGB, // warm cream headline
  dim: [188, 190, 200] as RGB, // body copy on night
  faint: [118, 122, 136] as RGB, // inactive / muted on night
  border: [44, 48, 60] as RGB,
  chip: [24, 28, 38] as RGB, // inactive icon chip on night
  gold: [205, 183, 153] as RGB, // --hero-gold (lifted for dark ground)
};
// A warm TWILIGHT waypoint the ramp passes through at the midpoint instead of a
// dead neutral grey. It echoes the hero's dusk (a deep plum-taupe) and — crucially
// — stays DARK (low luminance), so cream text keeps strong contrast all the way
// through the middle of the scroll. The brightening is therefore pushed to the
// final leg, where the text flips to ink. Result: a long, calm dark-with-warmth
// passage that resolves into daylight — smooth, never washed-out grey-on-grey.
const DUSK_BG = [58, 44, 62] as RGB;
const DAY = {
  bg: [244, 242, 239] as RGB, // --surface-primary
  fg: [26, 26, 26] as RGB, // --fg-primary
  dim: [74, 74, 74] as RGB, // --fg-secondary
  faint: [138, 133, 124] as RGB, // --fg-muted
  border: [234, 231, 225] as RGB, // --border-subtle
  chip: [251, 250, 248] as RGB, // --card
  gold: [168, 145, 95] as RGB, // --accent-deep
};
const mix = (a: RGB, b: RGB, t: number): RGB =>
  [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ] as RGB;
const rgb = (c: RGB) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// smoothstep — C1-continuous ease (zero slope at both ends) so every transition
// blends in and out with no kink. Used for the whole ramp + the text flip.
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const dawnVars = (progress: number): CSSProperties => {
  const p = clamp01(progress);
  // Background: NIGHT → DUSK over the first half, DUSK → DAY over the second.
  // Each leg is independently eased so the waypoint is glided through, not hit.
  const bg =
    p < 0.5
      ? mix(NIGHT.bg, DUSK_BG, smooth(p / 0.5))
      : mix(DUSK_BG, DAY.bg, smooth((p - 0.5) / 0.5));
  // Surfaces/accents brighten on the same late-weighted curve as the bg's 2nd leg.
  const s = smooth(p); // 0..1, eased
  // Foreground stays cream through the dark+dusk passage and eases to ink only on
  // the final brightening leg (p≈0.62→0.82) — a smooth fade, and because the bg is
  // still dusk-dark when it starts, contrast holds the whole way across.
  const fgT = smooth((p - 0.62) / 0.2);
  return {
    backgroundColor: rgb(bg),
    "--hiw-fg": rgb(mix(NIGHT.fg, DAY.fg, fgT)),
    "--hiw-dim": rgb(mix(NIGHT.dim, DAY.dim, fgT)),
    "--hiw-faint": rgb(mix(NIGHT.faint, DAY.faint, fgT)),
    "--hiw-border": rgb(mix(NIGHT.border, DAY.border, s)),
    "--hiw-chip": rgb(mix(NIGHT.chip, DAY.chip, s)),
    "--hiw-gold": rgb(mix(NIGHT.gold, DAY.gold, s)),
    transition: "background-color 200ms ease, --hiw-fg 200ms ease",
  } as CSSProperties;
};

const Intro = () => (
  <Reveal stagger={90} className="mx-auto max-w-2xl text-center">
    <p
      className="font-cap text-sm uppercase tracking-[0.18em]"
      style={{ color: "var(--hiw-gold, hsl(var(--accent-deep)))" }}
    >
      How it works
    </p>
    <h2
      className="mt-5 font-serif text-[40px] font-medium leading-[1.05] md:text-[56px]"
      style={{ color: "var(--hiw-fg, hsl(var(--fg-primary)))" }}
    >
      Learn the platform in three quiet steps
    </h2>
    <p
      className="mt-6 text-[18px] leading-relaxed md:text-[19px]"
      style={{ color: "var(--hiw-dim, hsl(var(--fg-secondary)))" }}
    >
      No jargon wall. Start with intention, prove your idea with data, then invest with a clearer head.
    </p>
  </Reveal>
);

const ClosingCta = () => (
  <Reveal delay={120} className="mt-12 flex flex-col items-center gap-5 text-center">
    <Link
      to="/auth"
      className="group inline-flex items-center gap-2.5 rounded-full bg-ink px-9 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
    >
      Create your free account
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
    <p className="font-cap text-sm" style={{ color: "var(--hiw-faint, hsl(var(--fg-muted)))" }}>
      Free to start · No credit card
    </p>
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
    <div className={cn("transition-opacity duration-500", active ? "opacity-100" : "opacity-45")}>
      <div className="flex items-center gap-3.5">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors duration-300"
          style={{
            borderColor: active
              ? "var(--hiw-gold, hsl(var(--accent-deep)))"
              : "var(--hiw-border, hsl(var(--border-subtle)))",
            background: active
              ? "color-mix(in srgb, var(--hiw-gold, hsl(var(--accent-deep))) 14%, transparent)"
              : "var(--hiw-chip, hsl(var(--card)))",
            color: active
              ? "var(--hiw-gold, hsl(var(--accent-deep)))"
              : "var(--hiw-faint, hsl(var(--fg-muted)))",
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className="font-cap text-sm uppercase tracking-[0.2em]"
          style={{ color: "var(--hiw-gold, hsl(var(--accent-deep)))" }}
        >
          {step.kicker}
        </span>
      </div>
      <h3
        className="mt-4 font-serif text-[26px] font-medium leading-[1.1] transition-colors duration-300 md:text-[38px]"
        style={{
          color: active
            ? "var(--hiw-fg, hsl(var(--fg-primary)))"
            : "var(--hiw-dim, hsl(var(--fg-secondary)))",
        }}
      >
        {step.title}
      </h3>
      <p
        className="mt-3 max-w-md text-[16px] leading-relaxed md:text-[17px]"
        style={{ color: "var(--hiw-dim, hsl(var(--fg-secondary)))" }}
      >
        {step.body}
      </p>
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

  // Reduced motion: plain stacked steps, every frame shown statically (no pin,
  // no dawn ramp). The --hiw-* vars are intentionally unset here so each child's
  // light fallback applies — the section renders on the normal light surface.
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
    <section id="how-it-works" style={dawnVars(progress)}>
      <div className="mx-auto w-full max-w-[1100px] px-6 pt-28 md:px-12 md:pt-36">
        <Intro />
      </div>

      {/* Tall track: scrolling through it drives the pinned stage AND the dawn
          ramp (the section bg + text vars lerp night → day as progress rises). */}
      <div ref={ref} className="relative" style={{ height: "320vh" }}>
        <div className="sticky top-0 flex min-h-[72vh] items-center">
          <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 items-center gap-12 px-6 md:px-12 lg:grid-cols-2 lg:gap-16">
            {/* Steps + progress rail */}
            <div className="flex gap-6">
              <div
                className="relative hidden w-[3px] shrink-0 overflow-hidden rounded-full sm:block"
                style={{ background: "var(--hiw-border, hsl(var(--border-subtle)))" }}
              >
                <div
                  className="absolute left-0 top-0 w-full rounded-full"
                  style={{
                    height: `${progress * 100}%`,
                    background: "var(--hiw-gold, hsl(var(--accent-deep)))",
                  }}
                />
              </div>
              <div className="flex flex-1 flex-col gap-7">
                {steps.map((step, i) => (
                  <StepCopy key={step.title} step={step} active={i === active} />
                ))}
              </div>
            </div>

            {/* Morphing visual — the light card reads as a lit panel glowing on
                the night ground early, then blends into the page as it brightens. */}
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

      <div className="mx-auto w-full max-w-[1100px] px-6 pb-12 md:px-12 md:pb-16">
        <ClosingCta />
      </div>
    </section>
  );
};

export default HowItWorks;
