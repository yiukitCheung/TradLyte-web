import { useMemo } from "react";

/**
 * Hero "Noise to One Line" animation — purely decorative, never real data.
 *
 * A dense field of red/green market "noise" bars (chaos) is cross-faded with a
 * single calm gold signal line (calm) on one shared 8s loop defined in index.css.
 * The whole stage is aria-hidden; an sr-only sentence describes it for AT users.
 *
 * No JS animation loop — only `transform`/`opacity` keyframes run. The single bit
 * of JS is the memoized bar field below, computed once from a seeded generator so
 * the layout is deterministic and does not re-shuffle between renders.
 */

const BAR_COUNT = 30;

type Bar = {
  height: number;
  up: boolean;
  duration: number;
  delay: number;
};

// Tiny deterministic PRNG (mulberry32) so the noise field is stable per mount.
const makeBars = (seed: number): Bar[] => {
  let s = seed;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: BAR_COUNT }, () => ({
    height: 22 + rand() * 70,
    up: rand() > 0.5,
    duration: 0.42 + rand() * 0.55,
    delay: rand() * 0.6,
  }));
};

const HeroAnimation = () => {
  const bars = useMemo(() => makeBars(0x9e3779b9), []);

  return (
    <>
      <div className="hero-stage" aria-hidden="true">
        {/* Chaos: flickering red/green noise field */}
        <div className="hero-chaos">
          {bars.map((bar, i) => (
            <span
              key={i}
              className="hero-bar"
              style={{
                height: `${bar.height}%`,
                backgroundColor: bar.up
                  ? "hsl(var(--hero-green))"
                  : "hsl(var(--hero-red))",
                boxShadow: bar.up
                  ? "0 0 7px hsl(var(--hero-green) / 0.6)"
                  : "0 0 7px hsl(var(--hero-red) / 0.6)",
                animationDuration: `${bar.duration}s`,
                animationDelay: `${bar.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Calm: single gold signal line + one restrained guardrail chip */}
        <div className="hero-calm">
          <svg
            className="hero-line-svg"
            viewBox="0 0 300 130"
            preserveAspectRatio="none"
          >
            <path
              className="hero-line"
              d="M0,116 C50,112 70,74 104,80 S168,46 200,52 250,20 300,14"
            />
          </svg>
          <span className="hero-chip">◈ Stop-loss · Cooldown</span>
        </div>

        {/* Gold filter scanline that sweeps chaos -> calm */}
        <span className="hero-sweep" />
      </div>

      <span className="sr-only">
        An abstract animation: a storm of chaotic red and green market noise is
        filtered down into a single steady, rising gold line.
      </span>
    </>
  );
};

export default HeroAnimation;
