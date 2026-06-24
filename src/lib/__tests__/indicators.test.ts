/**
 * EMA parity with the production scanner.
 *
 * Golden values were generated from the authoritative Python implementation
 *   TradLyte-core-engine/cloud/shared/analytics_core/indicators/technicals.py
 * via `calculate_ema(df, period=p)` on the fixed `closes` vector below. This
 * pins the client-side education math so it can't silently drift from the
 * engine (warm-up nulls included).
 *
 * Run: npm run test
 */
import { describe, it, expect } from "vitest";

import { ema, crossings, rsi, sma, rollingStd, macd, bollinger } from "../indicators";

// Fixed input used to generate the golden vectors.
const closes = [
  10.0, 10.5, 9.8, 10.2, 11.0, 10.7, 11.5, 12.0, 11.2, 11.8, 12.5, 12.1, 13.0,
  12.6, 13.4, 13.0, 12.2, 12.9, 13.8, 14.1,
];

// Golden EMA outputs from technicals.py (null = warm-up). 10dp precision.
const golden: Record<number, (number | null)[]> = {
  3: [
    null, null, 10.025, 10.1125, 10.55625, 10.628125, 11.0640625, 11.53203125,
    11.366015625, 11.5830078125, 12.0415039062, 12.0707519531, 12.5353759766,
    12.5676879883, 12.9838439941, 12.9919219971, 12.5959609985, 12.7479804993,
    13.2739902496, 13.6869951248,
  ],
  5: [
    null, null, null, null, 10.3975308642, 10.4983539095, 10.8322359396,
    11.2214906264, 11.2143270843, 11.4095513895, 11.7730342597, 11.8820228398,
    12.2546818932, 12.3697879288, 12.7131919525, 12.808794635, 12.60586309,
    12.7039087267, 13.0692724845, 13.412848323,
  ],
  8: [
    null, null, null, null, null, null, null, 10.9305742521, 10.9904466405,
    11.1703473871, 11.4658257455, 11.6067533576, 11.9163637226, 12.0682828953,
    12.3642200297, 12.5055044676, 12.4376145859, 12.5403669001, 12.8202853668,
    13.1046663964,
  ],
};

const TOL = 1e-8;

function assertEmaMatchesGolden(period: number) {
  const got = ema(closes, period);
  const want = golden[period];
  expect(got.length).toBe(want.length);
  for (let i = 0; i < want.length; i++) {
    if (want[i] === null) {
      expect(got[i]).toBe(null);
    } else {
      expect(got[i]).not.toBe(null);
      const diff = Math.abs((got[i] as number) - (want[i] as number));
      expect(diff < TOL).toBeTruthy();
    }
  }
}

describe("indicators", () => {
  it("EMA matches production technicals.py golden values (periods 3/5/8)", () => {
    assertEmaMatchesGolden(3);
    assertEmaMatchesGolden(5);
    assertEmaMatchesGolden(8);
  });

  it("EMA is null until `period` bars (warm-up parity with ewm_mean min_periods)", () => {
    const e = ema(closes, 5);
    for (let i = 0; i < 4; i++) expect(e[i]).toBe(null);
    expect(e[4]).not.toBe(null);
  });

  it("EMA period=1 is the price itself (no smoothing, no warm-up)", () => {
    const e = ema(closes, 1);
    for (let i = 0; i < closes.length; i++) expect(e[i]).toBe(closes[i]);
  });

  it("shorter period crosses price more often than a longer one (the whipsaw lesson)", () => {
    // The pedagogical claim the slider demonstrates, asserted numerically.
    const fast = crossings(closes, ema(closes, 3));
    const slow = crossings(closes, ema(closes, 8));
    expect(fast >= slow).toBeTruthy();
  });

  it("ema rejects invalid periods", () => {
    expect(() => ema(closes, 0)).toThrow();
    expect(() => ema(closes, 2.5)).toThrow();
  });

  // ---------------------------------------------------------------------------
  // RSI — parity with calculate_rsi (technicals.py), Lesson 02 ("pins in a trend")
  // ---------------------------------------------------------------------------

  // Choppy first third, then a strictly increasing run (RSI should climb and PIN at 100).
  const rsiCloses = [
    100.0, 101, 100, 102, 99, 101, 100, 102, 101, 100, 101, 103, 105, 107, 110,
    113, 116, 120, 124, 128, 132, 136, 140, 145, 150,
  ];

  // Golden RSI outputs from technicals.py (null = warm-up). 8dp precision.
  const rsiGolden: Record<number, (number | null)[]> = {
    5: [
      null, null, null, null, 42.85714286, 55.55555556, 44.44444444, 60.0,
      44.44444444, 57.14285714, 50.0, 71.42857143, 71.42857143, 87.5, 100.0,
      100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0,
    ],
    14: [
      null, null, null, null, null, null, null, null, null, null, null, null,
      null, 66.66666667, 70.83333333, 73.07692308, 78.57142857, 80.0, 90.32258065,
      90.90909091, 94.44444444, 94.73684211, 97.56097561, 100.0, 100.0,
    ],
  };

  const RSI_TOL = 1e-7; // golden is 8dp-rounded

  function assertRsiMatchesGolden(period: number) {
    const got = rsi(rsiCloses, period);
    const want = rsiGolden[period];
    expect(got.length).toBe(want.length);
    for (let i = 0; i < want.length; i++) {
      if (want[i] === null) {
        expect(got[i]).toBe(null);
      } else {
        expect(got[i]).not.toBe(null);
        const diff = Math.abs((got[i] as number) - (want[i] as number));
        expect(diff < RSI_TOL).toBeTruthy();
      }
    }
  }

  it("RSI matches production technicals.py golden values (periods 5/14)", () => {
    assertRsiMatchesGolden(5);
    assertRsiMatchesGolden(14);
  });

  it("RSI PINS at 100 in a sustained uptrend (the Lesson 02 aha)", () => {
    // strictly increasing => avgLoss 0 => rs Infinity => rsi exactly 100
    const up = Array.from({ length: 30 }, (_, i) => 100 + i * 1.5);
    const r = rsi(up, 14);
    for (let i = 13; i < up.length; i++) {
      expect(r[i]).toBe(100);
    }
  });

  it("RSI bottoms at 0 in a sustained downtrend", () => {
    const down = Array.from({ length: 30 }, (_, i) => 100 - i * 1.5);
    const r = rsi(down, 14);
    for (let i = 13; i < down.length; i++) {
      expect(r[i]).toBe(0);
    }
  });

  it("RSI is null until `period` bars and rejects invalid periods", () => {
    const r = rsi(rsiCloses, 5);
    for (let i = 0; i < 4; i++) expect(r[i]).toBe(null);
    expect(r[4]).not.toBe(null);
    expect(() => rsi(rsiCloses, 0)).toThrow();
  });

  it("sma is the rolling simple mean with period-1 warm-up nulls", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("rollingStd is the sample (ddof=1) stddev", () => {
    // window [2,4,6]: mean 4, var = (4+0+4)/(3-1) = 4, std = 2
    const out = rollingStd([2, 4, 6], 3);
    expect(out[0]).toBe(null);
    expect(out[1]).toBe(null);
    expect(Math.abs((out[2] as number) - 2) < 1e-12).toBeTruthy();
  });

  it("sma/rollingStd reject non-positive-integer periods", () => {
    expect(() => sma([1, 2], 0)).toThrow();
    expect(() => rollingStd([1, 2], 1.5)).toThrow();
  });

  it("macd line equals fastEMA minus slowEMA where both are warm, else null", () => {
    const closes = [1, 2, 1, 3, 5, 4, 6, 8, 7, 9, 11, 10, 12, 14];
    const r = macd(closes, { fast: 3, slow: 5, signal: 2 });
    const f = ema(closes, 3);
    const s = ema(closes, 5);
    for (let i = 0; i < closes.length; i++) {
      if (f[i] != null && s[i] != null) {
        expect(Math.abs((r.macd[i] as number) - ((f[i] as number) - (s[i] as number))) < 1e-9).toBeTruthy();
      } else {
        expect(r.macd[i]).toBe(null);
      }
    }
  });

  it("macd histogram equals macd minus signal", () => {
    const closes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const r = macd(closes, { fast: 2, slow: 3, signal: 2 });
    for (let i = 0; i < closes.length; i++) {
      if (r.macd[i] != null && r.signal[i] != null) {
        expect(Math.abs((r.histogram[i] as number) - ((r.macd[i] as number) - (r.signal[i] as number))) < 1e-9).toBeTruthy();
      } else {
        expect(r.histogram[i]).toBe(null);
      }
    }
  });

  it("macd histogram is positive at the end of a steady uptrend", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i); // strict uptrend
    const r = macd(closes);
    expect((r.histogram[59] as number) >= 0).toBeTruthy();
  });

  it("macd signal seeds at the first non-null macd value (histogram 0 there)", () => {
    // slow EMA warms at index slow-1; signal seeds to macd at that index, so hist=0 there.
    const closes = [1, 3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 13];
    const slow = 5;
    const r = macd(closes, { fast: 2, slow, signal: 3 });
    const firstIdx = slow - 1; // first index where macd line is non-null
    expect(r.macd[firstIdx]).not.toBe(null);
    expect(r.signal[firstIdx]).toBe(r.macd[firstIdx]); // seed == value
    expect(Math.abs(r.histogram[firstIdx] as number) < 1e-12).toBeTruthy(); // hist 0 at seed
  });

  it("macd signal lags the macd line in a steady uptrend (signal < macd once warm)", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
    const r = macd(closes);
    const last = closes.length - 1;
    expect((r.signal[last] as number) < (r.macd[last] as number)).toBeTruthy();
  });

  it("bollinger bands are middle +/- k*std", () => {
    const closes = [2, 4, 6, 8, 10, 12];
    const r = bollinger(closes, { period: 3, k: 2 });
    const m = sma(closes, 3);
    const s = rollingStd(closes, 3);
    for (let i = 0; i < closes.length; i++) {
      if (m[i] != null) {
        expect(Math.abs((r.upper[i] as number) - ((m[i] as number) + 2 * (s[i] as number))) < 1e-9).toBeTruthy();
        expect(Math.abs((r.lower[i] as number) - ((m[i] as number) - 2 * (s[i] as number))) < 1e-9).toBeTruthy();
      } else {
        expect(r.upper[i]).toBe(null);
        expect(r.lower[i]).toBe(null);
      }
    }
  });

  it("bollinger bandwidth widens as volatility rises", () => {
    const calm = [10, 10.1, 9.9, 10, 10.1, 9.9, 10, 10.1];
    const wild = [10, 13, 7, 11, 6, 14, 5, 15];
    const bw = (arr: number[]) => {
      const r = bollinger(arr, { period: 4, k: 2 });
      const i = arr.length - 1;
      return (r.upper[i] as number) - (r.lower[i] as number);
    };
    expect(bw(wild) > bw(calm)).toBeTruthy();
  });
});
