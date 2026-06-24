import { describe, it, expect } from "vitest";

import { ema, rsi, macd, bollinger, crossings } from "@/lib/indicators";
import {
  applyPriceKnob,
  emaCandles,
  rsiBaseCandles,
  lesson01Ema,
  lesson03Macd,
  lesson04Bollinger,
  LESSONS,
} from "@/components/education/lessons";

const closesOf = (cs: { c: number }[]) => cs.map((k) => k.c);
const okCandle = (k: { o: number; h: number; l: number; c: number }) =>
  k.h >= Math.max(k.o, k.c) - 1e-9 && k.l <= Math.min(k.o, k.c) + 1e-9 && k.l > 0;

describe("lessons", () => {
  it("generated candles are valid OHLC (high >= body >= low, all positive)", () => {
    expect(emaCandles.every(okCandle)).toBeTruthy();
    expect(rsiBaseCandles.every(okCandle)).toBeTruthy();
  });

  it("EMA lesson data whipsaws more at a short period than a long one", () => {
    const closes = closesOf(emaCandles);
    const fast = crossings(closes, ema(closes, 8));
    const slow = crossings(closes, ema(closes, 55));
    expect(fast > slow).toBeTruthy();
  });

  it("EMA period knob is continuous (no snaps)", () => {
    expect((lesson01Ema.knob as { snaps?: number[] }).snaps).toBe(undefined);
  });

  it("applyPriceKnob(drift) makes RSI pin near 100", () => {
    const driven = applyPriceKnob(rsiBaseCandles, "drift", 0.6);
    const r = rsi(closesOf(driven), 14);
    expect((r[r.length - 1] as number) >= 95).toBeTruthy();
  });

  it("applyPriceKnob(drift) turns the MACD histogram positive", () => {
    const driven = applyPriceKnob(rsiBaseCandles, "drift", 0.6);
    const h = macd(closesOf(driven)).histogram;
    expect((h[h.length - 1] as number) > 0).toBeTruthy();
  });

  it("applyPriceKnob(drift) turns the MACD histogram positive at the gated value 0.3", () => {
    const driven = applyPriceKnob(rsiBaseCandles, "drift", 0.3);
    const h = macd(driven.map((k) => k.c)).histogram;
    expect((h[h.length - 1] as number) > 0).toBeTruthy();
  });

  it("applyPriceKnob(volatility) widens late Bollinger bands (squeeze -> expansion)", () => {
    const wide = applyPriceKnob(rsiBaseCandles, "volatility", 1);
    const tight = applyPriceKnob(rsiBaseCandles, "volatility", 0);
    const bw = (cs: { c: number }[]) => {
      const r = bollinger(closesOf(cs), { period: 20, k: 2 });
      const i = cs.length - 1;
      return (r.upper[i] as number) - (r.lower[i] as number);
    };
    expect(bw(wide) > bw(tight)).toBeTruthy();
  });

  it("applyPriceKnob is deterministic and pure (amount 0 is identity)", () => {
    expect(applyPriceKnob(rsiBaseCandles, "drift", 0)).toEqual(rsiBaseCandles);
  });

  it("MACD and Bollinger lessons are registered with the right indicators and knobs", () => {
    expect(lesson03Macd.indicator).toBe("macd");
    expect((lesson03Macd.knob as { effect?: string }).effect).toBe("drift");
    expect(lesson04Bollinger.indicator).toBe("bollinger");
    expect((lesson04Bollinger.knob as { effect?: string }).effect).toBe("volatility");
    expect(LESSONS[lesson03Macd.id]).toBeTruthy();
    expect(LESSONS[lesson04Bollinger.id]).toBeTruthy();
  });
});
