/**
 * Lesson data + config for the interactive indicator education feature.
 *
 * Specs: docs/education-feature.md, docs/education-lesson-01-ema.md,
 * docs/education-lesson-02-rsi.md. The indicator math lives in lib/indicators.ts
 * (pinned to the production Python by lib/__tests__/indicators.test.ts).
 *
 * Sample price series are generated deterministically here so the widget needs
 * no network call — it ships with its own curated data.
 */

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export type LessonData = {
  symbol: string;
  candles: Candle[];
  /** Optional index spans the tour can pan/frame. */
  regimes?: { choppy?: [number, number]; trending?: [number, number] };
};

/**
 * The draggable knob.
 * - `param`: drags an indicator parameter (e.g. EMA period) — sensitivity lesson.
 * - `price`: drags "trend strength" (drift applied to the price) — saturation lesson.
 */
export type Knob =
  | { kind: "param"; name: string; min: number; max: number; default: number; snaps?: number[] }
  | { kind: "price"; name: string; min: number; max: number; default: number; effect: "drift" | "volatility" };

/** One beat of the guided tour. `gate` (if present) blocks "Next" until satisfied. */
export type TourStep = {
  id: string;
  copy: string;
  gate?: (knob: number) => boolean;
  gateHint?: string;
};

export type LessonConfig = {
  id: string;
  indicator: "ema" | "rsi" | "macd" | "bollinger";
  eyebrow: string;
  title: string;
  knob: Knob;
  data: LessonData;
  /** RSI uses a fixed period while the user drives price; EMA's period IS the knob. */
  fixedPeriod?: number;
  steps: TourStep[];
  cta: string;
};

// ---------------------------------------------------------------------------
// Deterministic synthetic price (so the lesson is self-contained, no fetch)
// ---------------------------------------------------------------------------

type RNG = () => number;

/** Deterministic PRNG (mulberry32). */
function rngFrom(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box-Muller. */
function gauss(rnd: RNG): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Realistic synthetic candles: volatility clustering (vol reverts toward
 * baseVol with shocks), opens that gap from the prior close, and randomized
 * wicks beyond the body. Deterministic for a given seed.
 */
function makeCandles(opts: {
  n: number;
  seed: number;
  start: number;
  baseVol: number;
  drift?: number | ((i: number) => number);
  persist?: number; // 0..1 volatility persistence
  wick?: number; // wick length as a multiple of vol
}): Candle[] {
  const { n, seed, start, baseVol } = opts;
  const drift = opts.drift ?? 0;
  const persist = opts.persist ?? 0.85;
  const wick = opts.wick ?? 0.9;
  const rnd = rngFrom(seed);
  const out: Candle[] = [];
  let close = start;
  let vol = baseVol;
  for (let i = 0; i < n; i++) {
    vol = Math.max(baseVol * 0.35, persist * vol + (1 - persist) * baseVol + gauss(rnd) * baseVol * 0.25);
    const d = typeof drift === "function" ? drift(i) : drift;
    const o = Math.max(1, close + gauss(rnd) * vol * 0.25);
    const c = Math.max(1, o + d + gauss(rnd) * vol);
    const h = Math.max(o, c) + Math.abs(gauss(rnd)) * vol * wick;
    const l = Math.max(0.5, Math.min(o, c) - Math.abs(gauss(rnd)) * vol * wick);
    out.push({ t: i, o, h, l, c, v: 1 + Math.abs(gauss(rnd)) });
    close = c;
  }
  return out;
}

/** Concatenate two candle runs, continuing price and re-indexing `t`. */
function concatCandles(a: Candle[], b: Candle[]): Candle[] {
  return [...a, ...b].map((k, i) => ({ ...k, t: i }));
}

/**
 * Transform base candles by the live knob. Pure.
 *  - "drift": parallel-shift each candle by `amount * t` (builds a trend ->
 *    pins RSI, flips MACD).
 *  - "volatility": expand each candle away from the series' mean, weighted to
 *    the late bars, so amount 0 = tight squeeze and large amount = expansion
 *    with price riding the upper band.
 */
export function applyPriceKnob(base: Candle[], effect: "drift" | "volatility", amount: number): Candle[] {
  if (!amount) return base;
  if (effect === "drift") {
    return base.map((k) => ({
      ...k,
      o: k.o + amount * k.t,
      h: k.h + amount * k.t,
      l: k.l + amount * k.t,
      c: k.c + amount * k.t,
    }));
  }
  const n = base.length;
  const basis = base.reduce((s, k) => s + k.c, 0) / n;
  return base.map((k) => {
    const w = n > 1 ? k.t / (n - 1) : 0; // 0..1, later bars expand more
    const gain = 1 + amount * w * 6; // range amplification
    const lift = amount * w * w * 12; // breakout drift, late & strong
    const ex = (x: number) => basis + (x - basis) * gain + lift;
    return { ...k, o: ex(k.o), h: ex(k.h), l: ex(k.l), c: Math.max(1, ex(k.c)) };
  });
}

// ---------------------------------------------------------------------------
// Per-lesson base candle arrays
// ---------------------------------------------------------------------------

/** Lesson 01 (EMA): choppy first half, then a clean uptrend. */
const emaChop = makeCandles({ n: 60, seed: 7, start: 100, baseVol: 2.4, persist: 0.8 });
const emaUp = makeCandles({
  n: 60,
  seed: 21,
  start: emaChop[emaChop.length - 1].c,
  baseVol: 1.6,
  drift: 0.7,
  persist: 0.88,
});
export const emaCandles: Candle[] = concatCandles(emaChop, emaUp);

/** Lessons 02/03 (RSI/MACD): a calm base; the knob adds drift live.
 *  seed=43, baseVol=0.6 — tuned so that applyPriceKnob("drift", 0.6) pins RSI ≥ 95
 *  and turns the MACD histogram positive (brief's seed=13/baseVol=1.9 left the
 *  last bars in a down-leg so 0.6/bar drift couldn't overcome the noise). */
export const rsiBaseCandles: Candle[] = makeCandles({ n: 160, seed: 43, start: 100, baseVol: 0.6, persist: 0.85 });

/** Lesson 04 (Bollinger): a quiet base; the knob scales volatility live. */
export const bbBaseCandles: Candle[] = makeCandles({ n: 120, seed: 41, start: 100, baseVol: 1.2, persist: 0.9 });

// ---------------------------------------------------------------------------
// Lesson configs
// ---------------------------------------------------------------------------

export const lesson01Ema: LessonConfig = {
  id: "ema-sensitivity",
  indicator: "ema",
  eyebrow: "Lesson 1 · Moving Average",
  title: "The sensitivity dial",
  knob: { kind: "param", name: "Period", min: 8, max: 169, default: 21 },
  data: { symbol: "SAMPLE", candles: emaCandles, regimes: { choppy: [0, 59], trending: [60, 119] } },
  steps: [
    { id: "drag-up", copy: "Drag the dial right. Watch the line.", gate: (v) => v >= 55, gateHint: "Drag the period up to 55+" },
    { id: "see-smooth", copy: "Smoother, right? It stopped reacting to every little bump — but in the rally it's now late. Smoothing costs you lag." },
    { id: "drag-down", copy: "Now drag it left, short and fast.", gate: (v) => v <= 13, gateHint: "Drag the period down to 13 or less" },
    { id: "see-whipsaw", copy: "Fast catches the move… and a dozen fake ones. Every cross in the choppy stretch is a head-fake." },
    { id: "aha", copy: "So which is right? Neither. Fast wins in a trend, slow wins in chop. There's no magic number — only the one that fits THIS market." },
    { id: "done", copy: "You just felt the core tradeoff behind every indicator. Want to tune it on a stock you actually hold?" },
  ],
  cta: "Open in Strategy Lab →",
};

export const lesson02Rsi: LessonConfig = {
  id: "rsi-saturation",
  indicator: "rsi",
  eyebrow: "Lesson 2 · RSI",
  title: "“Overbought” doesn’t mean sell",
  knob: { kind: "price", name: "Trend strength", min: 0, max: 0.6, default: 0, effect: "drift" },
  fixedPeriod: 14,
  data: { symbol: "SAMPLE", candles: rsiBaseCandles },
  steps: [
    { id: "intro", copy: "RSI sits in the middle — calm market, nobody’s in charge." },
    { id: "drag-trend", copy: "Now make it a real uptrend. Drag the trend up.", gate: (v) => v >= 0.3, gateHint: "Drag trend strength up" },
    { id: "cross-70", copy: "There it is — \u201coverbought.\u201d The textbook says sell here. But keep going, and watch the PRICE." },
    { id: "pin", copy: "Price kept ripping — and RSI just stayed pinned. \u201cSell at 70\u201d would’ve dumped you at the START of the move." },
    { id: "aha", copy: "In a trend, \u201coverbought\u201d means STRONG, not done. RSI is a momentum gauge — not a sell button." },
    { id: "done", copy: "Now you know why a single \u201coverbought\u201d reading lies. See how confirming it with another signal fixes that?" },
  ],
  cta: "Build a confirmed setup in Strategy Lab →",
};
export const lesson03Macd: LessonConfig = {
  id: "macd-momentum",
  indicator: "macd",
  eyebrow: "Lesson 3 · MACD",
  title: "Momentum, made visible",
  knob: { kind: "price", name: "Trend strength", min: 0, max: 0.6, default: 0, effect: "drift" },
  data: { symbol: "SAMPLE", candles: rsiBaseCandles },
  steps: [
    { id: "flat", copy: "Quiet market: the two MACD lines hug each other and the bars sit near zero. No momentum either way." },
    { id: "build", copy: "Now build a trend. Drag the strength up.", gate: (v) => v >= 0.3, gateHint: "Drag trend strength up" },
    { id: "cross", copy: "See the lines cross and the bars flip green? The histogram is momentum — it grows as the move accelerates." },
    { id: "stay", copy: "In a real trend the bars STAY green. MACD doesn\u2019t say \u2018too high\u2019 — it says \u2018still pushing.\u2019" },
    { id: "aha", copy: "The cross is the signal; the bars are the conviction. That\u2019s MACD in one move." },
    { id: "done", copy: "Want to test a MACD-style cross on a stock you hold? It\u2019s an EMA(12)/EMA(26) cross under the hood." },
  ],
  cta: "Open in Strategy Lab →",
};

export const lesson04Bollinger: LessonConfig = {
  id: "bollinger-squeeze",
  indicator: "bollinger",
  eyebrow: "Lesson 4 · Bollinger Bands",
  title: "The squeeze before the move",
  knob: { kind: "price", name: "Volatility", min: 0, max: 1, default: 0, effect: "volatility" },
  data: { symbol: "SAMPLE", candles: bbBaseCandles },
  steps: [
    { id: "calm", copy: "Calm market: the bands pinch in tight around price. That\u2019s a \u2018squeeze.\u2019" },
    { id: "expand", copy: "Now crank the volatility. Drag it up.", gate: (v) => v >= 0.5, gateHint: "Drag volatility up" },
    { id: "ride", copy: "The bands blow open and price rides the upper one. Wide bands = energy being released." },
    { id: "myth", copy: "Touching the upper band isn\u2019t \u2018sell.\u2019 In a breakout, price walks the band the whole way up." },
    { id: "aha", copy: "Bands measure volatility, not direction. The squeeze tells you a move is COMING — not which way." },
    { id: "done", copy: "That\u2019s how to read a candle, a trend, momentum, and volatility. You\u2019ve got the toolkit." },
  ],
  cta: "Done",
};

export const LESSONS: Record<string, LessonConfig> = {
  [lesson01Ema.id]: lesson01Ema,
  [lesson02Rsi.id]: lesson02Rsi,
  [lesson03Macd.id]: lesson03Macd,
  [lesson04Bollinger.id]: lesson04Bollinger,
};
