import { useMemo, type CSSProperties } from "react";
import "./HeroAnimation.css";

/**
 * Hero Variant E — "Warm Bloom — a candle lit in a dark room."
 *
 * A centered, RADIAL emotional arc on one long (~18s) loop. Distinct from a
 * horizon/daybreak: the warmth blooms outward from a single point at center —
 * a cream serif "T" mark ignites and a twilight glow expands concentrically,
 * pushing back the cold dark confusion like a candle lit in a dark room. The
 * "T" is not painted cream — its glyph is FILLED with the twilight gradient
 * itself (background-clip:text), so it reads as a serif letter lit from within
 * by dusk colors, not a flat cream mark.
 *
 *   Act 1 (0–6.0s)    COLD CONFUSION — a genuinely chaotic, COLD, unlit field:
 *                      flickering red/green candles, scrolling news chips, pulsing
 *                      FOMO tags, fin-fluencer bubbles, AND floating human QUESTIONS
 *                      that accumulate ONE BY ONE (a rising tide of doubt), each
 *                      fading in on its own index-derived delay. A restrained cold
 *                      vignette deepens so there is real darkness to push back against.
 *   Act 2 (6.0–10.0s)  TWILIGHT BLOOM — the "T" ignites SLOWLY at center; a warm
 *                      radial front (dusk-violet → amber → rose-gold) expands
 *                      gradually outward. Noise + questions dissolve right as the
 *                      warmth radius reaches them (per-glyph stagger by radial
 *                      distance tracks the bloom growth). The most existential
 *                      question lingers longest and dissolves as the "T" ignites —
 *                      a hand-off from question to answer.
 *   Act 3 (10.0–14.8s) STRUCTURED DECISION — a single, high-resolution gold equity
 *                      line draws, deliberately, across a proportional (aspect-locked)
 *                      chart panel weighted center-right: a smooth bezier curve with a
 *                      soft gold area-fill and faint gridlines, an honest up-trend with
 *                      one small drawdown. As the drawn line reaches each ascending
 *                      x, a LIFE-GOAL milestone reveals (dot + chip): First car ·
 *                      funded → World trip · on track → House down payment · coming.
 *                      The payoff is purpose, not profit — steady effort funding a life.
 *   Act 4 (14.8–18s)   REFLECTION — a serif journal line settles in over a warm
 *                      ambient wash (the room stays warmed): "Every steady step is a
 *                      life goal, funded." Then everything fades back to the dark to loop.
 *
 * Constraints honored:
 *  - CSS keyframes ONLY — no rAF / setInterval / JS animation loop.
 *  - The chaotic field is computed ONCE via a memoized seeded PRNG (mulberry32)
 *    so layout is deterministic per mount. Each noise glyph carries its radial
 *    distance from center so the CSS bloom fade staggers by distance.
 *  - All semantic colors come from the .hero-dark CSS custom properties; the
 *    decorative twilight stops are scoped new custom props on the root only.
 *  - SVG + stroke-dasharray draws the equity line. The chart panel is aspect-
 *    locked (CSS aspect-ratio matches the viewBox) and rendered with
 *    preserveAspectRatio="xMidYMid meet" so x and y pixel scales are EQUAL —
 *    nothing is stretched, the gold stroke is uniform, and milestone labels
 *    (positioned by viewBox fraction) track their dots at every hero size.
 *  - prefers-reduced-motion freezes on the calm Act-3/4 end state (see CSS).
 *  - Stage is aria-hidden; one sr-only sentence describes the arc.
 *  - Every class is prefixed `heroE-` so it never collides with siblings.
 */

// ---- seeded PRNG (mulberry32) — stable chaotic field per mount ---------------
const mulberry32 = (seed: number) => {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- chaotic-field content ---------------------------------------------------
const NEWS = [
  "MARKET CRASH?", "ALL-TIME HIGH", "SELL NOW", "FED PANIC", "BUY THE DIP",
  "RECESSION FEARS", "RATE CUT?", "BUBBLE BURSTS", "RED ALERT", "GREEN DAY",
  "VOLATILITY SPIKE", "PROFIT TAKING",
];
const FOMO = [
  "🚀 +240%", "everyone's buying", "🔥 don't miss out",
  "📈 to the moon", "last chance", "🤑 easy money", "⚡ +18% today",
];
const FLUENCERS = [
  "trust me bro", "10x guaranteed", "secret strategy",
  "i'm all in", "this 100x's", "buy now or cry",
];
// The human questions that voice the uncertainty — rendered in serif (Newsreader).
// They accumulate ONE BY ONE through Act 1 (a rising tide of doubt). The order here
// is the order they appear in; the most EXISTENTIAL question is placed last so it
// arrives last and (via the existential flag) lingers longest, dissolving as the
// "T" ignites — a poetic hand-off from question to answer.
const QUESTIONS = [
  "Buy or sell?",
  "What now?",
  "Is it too late?",
  "Who do I trust?",
  "How do we decide?", // existential — arrives last, lingers longest
];
// The single question that lingers through the bloom and hands off to the "T".
const EXISTENTIAL_QUESTION = "How do we decide?";

// ---- chart geometry (proportional, aspect-locked) ---------------------------
// viewBox ~16:7. The CSS aspect-ratio on .heroE-planSvg matches this so that
// preserveAspectRatio="xMidYMid meet" fills the box edge-to-edge with EQUAL x/y
// scale (no stretch), and viewBox-fraction label positions land exactly on dots.
const VB_W = 480;
const VB_H = 210;

// ⚠️ LOCKSTEP INVARIANT — DO NOT change VB_W/VB_H without updating the CSS.
// Milestone chips are positioned by viewBox FRACTION (left = x/VB_W, top = y/VB_H)
// and overlaid on the SVG. That only lands the chip exactly on its dot because:
//   (1) `.heroE-plan` has `aspect-ratio: 480 / 210` — IDENTICAL to this viewBox, and
//   (2) the SVG uses preserveAspectRatio="xMidYMid meet".
// When the box aspect already equals the viewBox aspect, `meet` produces ZERO
// letterbox, so x/y pixel scales are equal and dot-fraction == chip-fraction.
// If you change VB_W or VB_H here, you MUST update `aspect-ratio` in
// .heroE-plan (HeroAnimation.css) to `${VB_W} / ${VB_H}` in the same edit, or the
// chips will silently drift off their dots. ASPECT_GUARD below trips at module
// load (dev) if the two ever fall out of sync with the CSS literal.
const VB_ASPECT = VB_W / VB_H; // == 480/210; must equal .heroE-plan aspect-ratio
// The CSS aspect-ratio literal, mirrored here so the two are visibly coupled.
// Keep this tuple identical to `aspect-ratio: <CSS_PANEL_ASPECT[0]> / <CSS_PANEL_ASPECT[1]>`.
const CSS_PANEL_ASPECT: readonly [number, number] = [480, 210];
if (
  import.meta.env.DEV &&
  Math.abs(VB_ASPECT - CSS_PANEL_ASPECT[0] / CSS_PANEL_ASPECT[1]) > 1e-6
) {
  console.warn(
    "[HeroAnimation] viewBox aspect (%s) ≠ .heroE-plan CSS aspect-ratio (%s). " +
      "Milestone chips will drift off their dots — update aspect-ratio in HeroAnimation.css.",
    VB_ASPECT,
    CSS_PANEL_ASPECT[0] / CSS_PANEL_ASPECT[1],
  );
}

const PAD_X = 16;
const BASE_Y = 190; // solid baseline
const TOP_Y = 22; // headroom for the final milestone chip
// faint horizontal gridlines (decorative "real chart" read)
const GRID_Y = [56, 100, 144];

// Honest equity points: an overall up-trend with ONE small, real drawdown
// (the dip around x≈210). Anchored low-left, climbing to a high-right peak.
// Milestone x's coincide with rising waypoints so each chip lands on the line.
const EQUITY_POINTS: ReadonlyArray<readonly [number, number]> = [
  [PAD_X, 178],
  [70, 160],
  [110, 168], // gentle settle
  [150, 150], // ← milestone 1 (First car)
  [192, 158], // small honest drawdown begins
  [224, 170], // dip trough
  [262, 138], // recovers, climbs
  [300, 120], // ← milestone 2 (World trip) — placed near here
  [344, 96],
  [392, 70],
  [VB_W - PAD_X, TOP_Y], // ← milestone 3 (House) at the peak
];

// Catmull-Rom → cubic-bezier smoothing for a premium, high-resolution curve
// (not a coarse polyline). Tension 0 (uniform Catmull-Rom).
const smoothPath = (pts: ReadonlyArray<readonly [number, number]>): string => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
};

const LINE_D = smoothPath(EQUITY_POINTS);
// area fill = the line, closed down to the baseline and back
const AREA_D = `${LINE_D} L${VB_W - PAD_X},${BASE_Y} L${PAD_X},${BASE_Y} Z`;

// The emotional payoff: ascending LIFE-GOAL milestones (purpose, not profit).
// Each x/y sits on the drawn line so the chip reveals as the line reaches it.
const MILESTONES = [
  { icon: "🚗", goal: "First car", state: "funded", x: 150, y: 150, anchor: "below" },
  { icon: "✈️", goal: "World trip", state: "on track", x: 300, y: 120, anchor: "above" },
  { icon: "🏡", goal: "House down payment", state: "coming", x: VB_W - PAD_X, y: TOP_Y, anchor: "above" },
] as const;

type Glyph = {
  kind: "news" | "fomo" | "fluencer" | "question" | "candle";
  text: string;
  x: number; // % left within stage
  y: number; // % top within stage
  dist: number; // radial distance from center 0..1 (drives bloom-fade stagger)
  dur: number; // flicker/drift duration
  delay: number; // flicker/drift delay
  drift: number; // px micro-drift
  up?: boolean; // candle direction
  bodyTop?: number;
  bodyH?: number;
  qIndex?: number; // question accumulation order (drives one-by-one fade-in)
  existential?: boolean; // the lingering question that hands off to the "T"
};

const HeroAnimation = () => {
  // One memoized RNG pass builds the entire deterministic chaotic field.
  const field = useMemo(() => {
    const rand = mulberry32(0x5e1d2991);

    // place an item, keeping a clear "keep-out" disc around the center so the
    // igniting "T" and the equity line have a clean stage.
    const place = (): { x: number; y: number; dist: number } => {
      for (let tries = 0; tries < 24; tries++) {
        const x = 6 + rand() * 88; // 6%..94%
        const y = 10 + rand() * 80; // 10%..90%
        // normalized distance from center (50,50); x weighted for aspect ratio
        const dx = (x - 50) / 50;
        const dy = (y - 50) / 50;
        const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 1.2);
        if (dist > 0.22) return { x, y, dist }; // keep center clear
      }
      return { x: 12, y: 14, dist: 0.9 };
    };

    const make = (kind: Glyph["kind"], text: string): Glyph => {
      const p = place();
      return {
        kind,
        text,
        x: p.x,
        y: p.y,
        dist: p.dist,
        // faster, more frantic pop: tighter flicker/drift cycle (1.1–2.2s, was
        // 3.0–4.8s) and short staggered delays so the field floods in quickly.
        dur: 1.1 + rand() * 1.1,
        delay: rand() * 1.5,
        drift: -14 + rand() * 28, // wider lateral jitter — more agitated
      };
    };

    const glyphs: Glyph[] = [
      ...NEWS.map((t) => make("news", t)),
      ...FOMO.map((t) => make("fomo", t)),
      ...FLUENCERS.map((t) => make("fluencer", t)),
      // questions carry their accumulation index so they appear one-by-one
      ...QUESTIONS.map((t, qi) => ({
        ...make("question", t),
        qIndex: qi,
        existential: t === EXISTENTIAL_QUESTION,
      })),
    ];

    // Mini candlesticks scattered as the price-noise layer — denser now (18)
    // and flickering faster (0.9–1.8s, was 2.6–4.2s) so the price noise feels
    // like a frantic, churning ticker board before the calm.
    const candles: Glyph[] = Array.from({ length: 18 }, () => {
      const p = place();
      return {
        kind: "candle" as const,
        text: "",
        x: p.x,
        y: p.y,
        dist: p.dist,
        dur: 0.9 + rand() * 0.9,
        delay: rand() * 1.4,
        drift: 0,
        up: rand() > 0.5,
        bodyTop: 20 + rand() * 30,
        bodyH: 16 + rand() * 28,
      };
    });

    return { glyphs, candles };
  }, []);

  // A glyph's bloom-fade delay scales with its distance from center: closer
  // glyphs are reached by the warmth first, farther glyphs last — so the
  // dissolve visibly tracks the warmth radius growing outward. Widened to 2.4s
  // (was 1.5s) so the staggered "reaching" reads against the slower, more
  // gradual bloom. Expressed as a CSS var the bloom-fade keyframe consumes.
  const bloomDelay = (dist: number) => `${(dist * 2.4).toFixed(2)}s`;

  // Questions accumulate ONE BY ONE through Act 1. Each question's appearance is
  // deferred by an index-derived delay (deterministic, NOT random): a rising tide
  // of doubt. The delay shifts the whole questionLife keyframe, so we keep the
  // four chaos questions TIGHT (~0.45s apart, total spread ≤ ~1.35s of an 18s
  // loop) so the dissolve window — now pushed to ~38–48%, AFTER the bloom has
  // kindled — clears every chaos question while the warm front is reaching it,
  // not before. The existential question is the EXCEPTION: it gets its own LATE
  // appearance delay so it arrives last (after the four chaos questions), then
  // lingers via heroE-questionLifeExistential and is the last to leave.
  const questionAppearDelay = (qi: number, existential: boolean) =>
    existential ? "0s" : `${(qi * 0.45).toFixed(2)}s`;

  return (
    <>
      <div className="heroE-stage" aria-hidden="true">
        {/* Cold dark ground — the deep navy confusion field (also RM floor). */}
        <div className="heroE-cold" />
        {/* Restrained cold vignette — anxious, unlit edges through Act 1. */}
        <div className="heroE-coldVignette" />

        {/* Warm ambient wash — once the bloom settles, a gentle warmth sits over
            the WHOLE field through Acts 3–4 so the end state is unmistakably warm
            vs. the cold open. This is the room staying warmed. */}
        <div className="heroE-warmWash" />

        {/* ===================== ACT 1 — DARK CONFUSION ===================== */}
        <div className="heroE-chaos">
          {/* scattered flickering candlesticks (price noise) */}
          {field.candles.map((c, i) => (
            <span
              key={`c${i}`}
              className="heroE-candle"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                // bloom-fade timing offset by radial distance from center
                "--heroE-bd": bloomDelay(c.dist),
              } as CSSProperties}
            >
              <i
                className="heroE-candleFlick"
                style={{
                  animationDuration: `${c.dur}s`,
                  animationDelay: `${c.delay}s`,
                }}
              >
                <i
                  className="heroE-wick"
                  style={{
                    top: `${(c.bodyTop || 0) - 8}%`,
                    height: `${(c.bodyH || 0) + 16}%`,
                    background: c.up
                      ? "hsl(var(--hero-green))"
                      : "hsl(var(--hero-red))",
                  }}
                />
                <i
                  className="heroE-body"
                  style={{
                    top: `${c.bodyTop}%`,
                    height: `${c.bodyH}%`,
                    background: c.up
                      ? "hsl(var(--hero-green))"
                      : "hsl(var(--hero-red))",
                  }}
                />
              </i>
            </span>
          ))}

          {/* news chips, FOMO tags, fluencer bubbles, and human questions */}
          {field.glyphs.map((g, i) => (
            <span
              key={`g${i}`}
              className={
                `heroE-glyph heroE-glyph--${g.kind}` +
                (g.existential ? " heroE-glyph--existential" : "")
              }
              style={{
                left: `${g.x}%`,
                top: `${g.y}%`,
                // dissolve stagger: warmth reaches this glyph by radial distance
                "--heroE-bd": bloomDelay(g.dist),
                // questions only: deterministic one-by-one appearance delay
                ...(g.kind === "question"
                  ? {
                      "--heroE-qa": questionAppearDelay(
                        g.qIndex ?? 0,
                        !!g.existential,
                      ),
                    }
                  : {}),
              } as CSSProperties}
            >
              <span
                className="heroE-glyphInner"
                style={{
                  animationDuration: `${g.dur}s`,
                  animationDelay: `${g.delay}s`,
                  transform: `translateX(${g.drift}px)`,
                }}
              >
                {g.kind === "fluencer" && <i className="heroE-avatar" />}
                {g.text}
              </span>
            </span>
          ))}
        </div>

        {/* ===================== ACT 2 — TWILIGHT BLOOM ===================== */}
        {/* Concentric warm rings expanding from center — the radial warmth front. */}
        <div className="heroE-bloom" />
        <div className="heroE-bloomRing heroE-bloomRing--1" />
        <div className="heroE-bloomRing heroE-bloomRing--2" />

        {/* The twilight that ignites at center — pure dusk light, no glyph.
            Layered halo (markGlow + markBloom) blooms warm at center and hands
            its light to the chart as it dims. */}
        <div className="heroE-mark">
          <span className="heroE-markBloom" />
          <span className="heroE-markGlow" />
        </div>

        {/* ===================== ACT 3 — STRUCTURED DECISION =====================
            A proportional, high-resolution equity chart. The SVG box is aspect-
            locked (CSS aspect-ratio matches the VB_W:VB_H viewBox) and uses
            preserveAspectRatio="xMidYMid meet", so x and y scale EQUALLY — the
            gold stroke is uniform everywhere and milestone labels positioned by
            viewBox fraction track their dots at any hero size. */}
        <div className="heroE-plan">
          <svg
            className="heroE-planSvg"
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* soft gold area-fill fading to transparent under the line */}
              <linearGradient id="heroE-areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--hero-gold))" stopOpacity="0.30" />
                <stop offset="55%" stopColor="hsl(var(--hero-gold))" stopOpacity="0.10" />
                <stop offset="100%" stopColor="hsl(var(--hero-gold))" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* very-faint horizontal gridlines for a "real chart" read */}
            {GRID_Y.map((gy, i) => (
              <line
                key={`grid${i}`}
                className="heroE-grid"
                x1={PAD_X}
                y1={gy}
                x2={VB_W - PAD_X}
                y2={gy}
              />
            ))}
            {/* solid baseline */}
            <line
              className="heroE-baseline"
              x1={PAD_X}
              y1={BASE_Y}
              x2={VB_W - PAD_X}
              y2={BASE_Y}
            />

            {/* soft gold area fill under the smooth curve (draws on with the line) */}
            <path className="heroE-area" d={AREA_D} />
            {/* the high-res equity line: a Catmull-Rom-smoothed bezier through the
                points — one solid, fully-connected stroke (pathLength=100 +
                dasharray:100). With proportional (meet) scaling the dash is even,
                so the draw-on always reaches the final point. */}
            <path className="heroE-equity" pathLength={100} d={LINE_D} />

            {/* milestone dots reveal as the drawn line reaches each x */}
            {MILESTONES.map((m, i) => (
              <circle
                key={`dot${i}`}
                className={`heroE-dot heroE-dot--m${i + 1}`}
                cx={m.x}
                cy={m.y}
                r="3.4"
              />
            ))}
            {/* soft "goal reached" settle-glow under the final milestone */}
            <circle
              className="heroE-peakGlow"
              cx={MILESTONES[MILESTONES.length - 1].x}
              cy={MILESTONES[MILESTONES.length - 1].y}
              r="9"
            />
          </svg>

          {/* Life-goal milestone chips. left/top are each dot's (x,y) as a
              fraction of the viewBox — and because the SVG box is aspect-locked
              and uses meet, that fraction maps to the same on-screen point as
              the dot. Each chip reveals the moment the line reaches its x. */}
          {MILESTONES.map((m, i) => (
            <span
              key={`ms${i}`}
              className={`heroE-ms heroE-ms--m${i + 1} heroE-ms--${m.anchor}`}
              style={{
                left: `${(m.x / VB_W) * 100}%`,
                top: `${(m.y / VB_H) * 100}%`,
              }}
            >
              <span className="heroE-msIcon" aria-hidden="true">{m.icon}</span>
              <span className="heroE-msText">
                <span className="heroE-msGoal">{m.goal}</span>
                <span className="heroE-msState">{m.state}</span>
              </span>
            </span>
          ))}
        </div>

        {/* ===================== ACT 4 — REFLECTION ===================== */}
        <div className="heroE-reflect">
          <span className="heroE-journal">
            Every steady step is a life goal, funded.
          </span>
        </div>
      </div>

      <span className="sr-only">
        An abstract animation: a dark, cold storm of market noise and anxious
        human questions gathers one by one — a rising tide of doubt that crests
        on the last, hardest question, &ldquo;how do we decide?&rdquo; — until a
        warm twilight light kindles at its center and blooms outward, dissolving
        each question as the warmth reaches it. The light then hands off to a steady, rising gold
        line that funds real life goals one by one — a first car, a world trip, a
        house down payment — closing on a calm reflection: every steady step is a
        life goal, funded.
      </span>
    </>
  );
};

export default HeroAnimation;
