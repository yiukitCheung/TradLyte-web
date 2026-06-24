/**
 * Client-side technical indicators for the interactive education widget.
 *
 * These mirror the production scanner math in
 *   TradLyte-core-engine/cloud/shared/analytics_core/indicators/technicals.py
 * closely enough to be *pedagogically* correct. They are NOT a second source of
 * truth for trading signals — the engine remains authoritative. The pinning
 * test (lib/__tests__/indicators.test.ts) asserts parity with golden values
 * generated from the Python implementation so this can't silently drift.
 *
 * Everything here is pure, synchronous, and cheap: an EMA over a few hundred
 * candles is a single O(n) pass (microseconds). The education widget recomputes
 * on every slider frame in-process — it never calls the backend.
 *
 * See docs/education-feature.md and docs/education-lesson-01-ema.md.
 */

/**
 * Exponential Moving Average — parity with `calculate_ema` (technicals.py).
 *
 * Matches Polars `ewm_mean(alpha=2/(period+1), adjust=False)` seeded at the
 * first bar, then nulled until `period` observations exist (the warm-up guard
 * we added so an unwarmed EMA never produces a meaningless value). With
 * `adjust=False` the recurrence is:
 *
 *   ema[0] = close[0]
 *   ema[i] = alpha * close[i] + (1 - alpha) * ema[i-1]
 *
 * The first `period - 1` outputs are `null` (warm-up), exactly like the Python.
 *
 * Assumes `closes` has no gaps/nulls (true for the widget's sample data).
 */
export function ema(closes: number[], period: number): (number | null)[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`ema: period must be a positive integer, got ${period}`);
  }
  const alpha = 2 / (period + 1);
  const out: (number | null)[] = new Array(closes.length).fill(null);
  let prev = Number.NaN;
  for (let i = 0; i < closes.length; i++) {
    const x = closes[i];
    prev = i === 0 ? x : alpha * x + (1 - alpha) * prev;
    if (i >= period - 1) out[i] = prev; // warm-up: null until `period` bars
  }
  return out;
}

/**
 * Number of crossings between price and an EMA line over the series — a cheap
 * proxy the widget uses to *show* "whipsaw count" as the user drags the period
 * down (short period => many crossings => many fake signals).
 *
 * Null (warm-up) EMA points are skipped.
 */
export function crossings(closes: number[], line: (number | null)[]): number {
  let count = 0;
  let prevSign = 0;
  for (let i = 0; i < closes.length; i++) {
    const v = line[i];
    if (v == null) continue;
    const sign = Math.sign(closes[i] - v);
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) count++;
    if (sign !== 0) prevSign = sign;
  }
  return count;
}

/**
 * Relative Strength Index — parity with `calculate_rsi` (technicals.py).
 *
 * SMA-based (simple rolling mean of gains/losses, NOT Wilder smoothing) to match
 * the engine exactly:
 *
 *   delta   = close[i] - close[i-1]      (delta at i=0 treated as 0, like fill_null)
 *   gain    = max(delta, 0),  loss = max(-delta, 0)
 *   avgGain = rolling_mean(gain, period),  avgLoss = rolling_mean(loss, period)
 *   rs      = avgGain / avgLoss
 *   rsi     = 100 - 100 / (1 + rs)
 *
 * First `period - 1` outputs are `null` (warm-up). In a sustained uptrend
 * avgLoss -> 0, so rs -> Infinity and rsi -> 100: the indicator **pins at 100**.
 * That pinning is the entire point of Lesson 02 — "overbought" does not mean
 * "about to fall"; in a trend it means "strong". A pure downtrend pins at 0.
 * (A perfectly flat window gives 0/0 = NaN, matching Polars.)
 */
export function rsi(closes: number[], period = 14): (number | null)[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`rsi: period must be a positive integer, got ${period}`);
  }
  const n = closes.length;
  const gain = new Array<number>(n).fill(0);
  const loss = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gain[i] = d;
    else if (d < 0) loss[i] = -d;
  }
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    let sg = 0;
    let sl = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sg += gain[j];
      sl += loss[j];
    }
    const avgGain = sg / period;
    const avgLoss = sl / period;
    const rs = avgGain / avgLoss; // avgLoss==0 -> Infinity -> rsi 100 (the pin)
    out[i] = 100 - 100 / (1 + rs);
  }
  return out;
}

/**
 * Simple Moving Average (Bollinger basis). First `period-1` outputs are null
 * (warm-up), matching the ema/rsi convention. O(n) sliding sum.
 */
export function sma(closes: number[], period: number): (number | null)[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`sma: period must be a positive integer, got ${period}`);
  }
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += closes[i];
    if (i >= period) sum -= closes[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Rolling sample standard deviation (ddof = 1) — parity with Polars
 * `rolling_std` used by `calculate_bollinger_bands` (technicals.py). First
 * `period-1` outputs are null. For period < 2 every output is null (ddof=1 is
 * undefined for a window of 1; Bollinger uses period 20).
 */
export function rollingStd(closes: number[], period: number): (number | null)[] {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`rollingStd: period must be a positive integer, got ${period}`);
  }
  const n = closes.length;
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = period - 1; i < n; i++) {
    let mean = 0;
    for (let j = i - period + 1; j <= i; j++) mean += closes[j];
    mean /= period;
    let ss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = closes[j] - mean;
      ss += d * d;
    }
    out[i] = period > 1 ? Math.sqrt(ss / (period - 1)) : null;
  }
  return out;
}

export interface MacdResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

/**
 * EMA over a series that may have leading nulls (the MACD line during the slow
 * EMA's warm-up). Seeds at the first non-null value and applies the standard
 * adjust=false recurrence — matches Polars `ewm_mean(adjust=False)` over a
 * column whose leading entries are null (used for MACD's signal line). No extra
 * warm-up nulling: the signal emits from the first non-null MACD value.
 */
function emaOfSparse(values: (number | null)[], period: number): (number | null)[] {
  const alpha = 2 / (period + 1);
  const out: (number | null)[] = new Array(values.length).fill(null);
  let prev = Number.NaN;
  let seen = 0;
  for (let i = 0; i < values.length; i++) {
    const x = values[i];
    if (x == null) continue;
    prev = seen === 0 ? x : alpha * x + (1 - alpha) * prev;
    seen++;
    out[i] = prev;
  }
  return out;
}

/**
 * MACD — parity with `calculate_macd` (technicals.py):
 *   macdLine  = ema(fast) - ema(slow)
 *   signal    = ema(signal) of the macd line (seeded at its first non-null)
 *   histogram = macdLine - signal
 * The macd line is null until the slow EMA is warm.
 */
export function macd(
  closes: number[],
  opts: { fast?: number; slow?: number; signal?: number } = {},
): MacdResult {
  const fast = opts.fast ?? 12;
  const slow = opts.slow ?? 26;
  const signalPeriod = opts.signal ?? 9;
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine: (number | null)[] = closes.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f == null || s == null ? null : f - s;
  });
  const signal = emaOfSparse(macdLine, signalPeriod);
  const histogram = macdLine.map((m, i) => {
    const sg = signal[i];
    return m == null || sg == null ? null : m - sg;
  });
  return { macd: macdLine, signal, histogram };
}

export interface BollingerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

/**
 * Bollinger Bands — parity with `calculate_bollinger_bands` (technicals.py):
 *   middle = sma(period)
 *   band   = rollingStd(period) * k     (sample stddev, ddof=1)
 *   upper  = middle + band,  lower = middle - band
 */
export function bollinger(
  closes: number[],
  opts: { period?: number; k?: number } = {},
): BollingerResult {
  const period = opts.period ?? 20;
  const k = opts.k ?? 2;
  const middle = sma(closes, period);
  const sd = rollingStd(closes, period);
  const upper = middle.map((m, i) => (m == null || sd[i] == null ? null : m + k * (sd[i] as number)));
  const lower = middle.map((m, i) => (m == null || sd[i] == null ? null : m - k * (sd[i] as number)));
  return { middle, upper, lower };
}
