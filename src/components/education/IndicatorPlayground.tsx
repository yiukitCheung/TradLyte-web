/**
 * IndicatorPlayground — the shared interactive "drag-to-understand" component.
 *
 * Web port of TradLyte-app/components/education/IndicatorPlayground.tsx.
 * All math/geometry/state/hooks are identical to the mobile source; only the
 * rendering primitives and styling have changed (RN → DOM/SVG + Tailwind).
 *
 * Chart width is measured via a div ref + ResizeObserver (replacing RN's
 * onLayout/LayoutChangeEvent). The `chartW > 0 && paths` render guard is
 * preserved so the SVG is never drawn until a real width is available.
 *
 * SVG element color props use "hsl(var(--token))" strings (never hardcoded hex):
 *   EMA overlay / knob handle  → hsl(var(--accent-deep))
 *   Bollinger/RSI/MACD lines   → hsl(var(--accent-ink))
 *   Candle up                  → hsl(var(--positive))
 *   Candle down                → hsl(var(--negative))
 *   Pane background            → hsl(var(--surface-sunken))
 *   Guide / zero lines         → hsl(var(--border-strong))
 *   MACD signal line           → hsl(var(--accent-deep))
 *
 * See docs/education-feature.md and docs/education-lesson-0*.md.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { crossings, ema, macd, bollinger, rsi } from "@/lib/indicators";
import { applyPriceKnob } from "@/components/education/lessons";
import type { LessonConfig } from "@/components/education/lessons";
import KnobSlider from "@/components/education/KnobSlider";
import LessonTour from "@/components/education/LessonTour";

export type PlaygroundState = { indicator: "ema" | "rsi" | "macd" | "bollinger"; knob: number; symbol: string };

export interface IndicatorPlaygroundProps {
  lesson: LessonConfig;
  /** Fired when the user reaches the final step (analytics / unlock). */
  onComplete?: () => void;
  /** Hand the current dial + symbol to the Strategy Lab (bridge to lib/strategyHandoff). */
  onCtaToLab?: (state: PlaygroundState) => void;
}

// ---- layout constants (match mobile exactly) ----
const PRICE_H = 170;
const OSC_H = 92;
const GAP = 10;
const PAD = { l: 6, r: 6, t: 12, b: 12 };

export default function IndicatorPlayground({ lesson, onComplete, onCtaToLab }: IndicatorPlaygroundProps) {
  const { knob } = lesson;
  const [knobValue, setKnobValue] = useState(knob.default);
  const [stepIndex, setStepIndex] = useState(0);
  const [chartW, setChartW] = useState(0);

  // ---- chart width measurement via ResizeObserver (replaces RN onLayout) ----
  const chartDivRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartDivRef.current;
    if (!el) return;
    // Measure once on mount
    setChartW(el.getBoundingClientRect().width);
    // Then track resizes
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartW(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isOsc = lesson.indicator === "rsi";
  const hasLowerPane = lesson.indicator === "rsi" || lesson.indicator === "macd";
  const totalH = PRICE_H + (hasLowerPane ? GAP + OSC_H : 0);

  // ---- live recompute (identical to mobile) ----
  const view = useMemo(() => {
    const candles =
      knob.kind === "price" ? applyPriceKnob(lesson.data.candles, knob.effect, knobValue) : lesson.data.candles;
    const closes = candles.map((c) => c.c);

    const period = knob.kind === "param" ? Math.round(knobValue) : lesson.fixedPeriod ?? 14;
    const overlay = lesson.indicator === "ema" ? ema(closes, period) : null;
    const osc = lesson.indicator === "rsi" ? rsi(closes, period) : null;
    const macdView = lesson.indicator === "macd" ? macd(closes) : null;
    const bands = lesson.indicator === "bollinger" ? bollinger(closes) : null;

    const whip = overlay ? crossings(closes, overlay) : 0;
    let pinnedBars = 0;
    if (osc) for (let i = osc.length - 1; i >= 0 && (osc[i] ?? 0) > 70; i--) pinnedBars++;
    const lastRsi = osc ? osc[osc.length - 1] : null;

    return { candles, closes, overlay, osc, period, whip, pinnedBars, lastRsi, macd: macdView, bands };
  }, [lesson, knob, knobValue]);

  // ---- scales / paths (identical math to mobile) ----
  const paths = useMemo(() => {
    const W = chartW;
    if (W <= 0) return null;
    const n = view.closes.length;
    const xOf = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
    const yOf = (v: number, lo: number, hi: number, top: number, h: number) =>
      top + PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (h - PAD.t - PAD.b);

    const toPath = (vals: (number | null)[], lo: number, hi: number, top: number, h: number) => {
      let d = "";
      let started = false;
      for (let i = 0; i < vals.length; i++) {
        const v = vals[i];
        if (v == null || !Number.isFinite(v)) continue;
        const x = xOf(i).toFixed(1);
        const y = yOf(v, lo, hi, top, h).toFixed(1);
        d += started ? ` L${x} ${y}` : `M${x} ${y}`;
        started = true;
      }
      return d;
    };

    // price pane range (include candle highs/lows, overlay, and band values so nothing clips)
    const lows = view.candles.map((k) => k.l);
    const highs = view.candles.map((k) => k.h);
    const overlayVals = view.overlay ? view.overlay.filter((v): v is number => v != null) : [];
    const bandUpperVals = view.bands ? view.bands.upper.filter((v): v is number => v != null) : [];
    const bandLowerVals = view.bands ? view.bands.lower.filter((v): v is number => v != null) : [];
    const lo = Math.min(...lows, ...overlayVals, ...bandUpperVals, ...bandLowerVals);
    const hi = Math.max(...highs, ...overlayVals, ...bandUpperVals, ...bandLowerVals);

    const bodyW = Math.max(2, (W - PAD.l - PAD.r) / n - 1.5);
    const candleGeo = view.candles.map((k, i) => {
      const x = xOf(i);
      const yO = yOf(k.o, lo, hi, 0, PRICE_H);
      const yC = yOf(k.c, lo, hi, 0, PRICE_H);
      return {
        x,
        up: k.c >= k.o,
        yHigh: yOf(k.h, lo, hi, 0, PRICE_H),
        yLow: yOf(k.l, lo, hi, 0, PRICE_H),
        bodyTop: Math.min(yO, yC),
        bodyH: Math.max(1, Math.abs(yC - yO)),
      };
    });

    // Bollinger band paths (price pane)
    const bandPaths = view.bands
      ? {
          upper: toPath(view.bands.upper, lo, hi, 0, PRICE_H),
          middle: toPath(view.bands.middle, lo, hi, 0, PRICE_H),
          lower: toPath(view.bands.lower, lo, hi, 0, PRICE_H),
        }
      : null;

    // MACD lower pane (symmetric scale around 0)
    const macdPane = view.macd
      ? (() => {
          const vals = [
            ...view.macd.macd.filter((v): v is number => v != null),
            ...view.macd.signal.filter((v): v is number => v != null),
          ];
          const m = Math.max(0.0001, ...vals.map((v) => Math.abs(v)));
          const yM = (v: number) => yOf(v, -m, m, PRICE_H + GAP, OSC_H);
          const bw = Math.max(2, (W - PAD.l - PAD.r) / n - 1.5);
          const zero = yM(0);
          const bars = view.macd.histogram
            .map((h, i) =>
              h == null
                ? null
                : { x: xOf(i), y: Math.min(zero, yM(h)), h: Math.max(1, Math.abs(yM(h) - zero)), up: h >= 0 },
            )
            .filter((b): b is { x: number; y: number; h: number; up: boolean } => b !== null);
          return {
            bars,
            bw,
            line: toPath(view.macd.macd, -m, m, PRICE_H + GAP, OSC_H),
            signal: toPath(view.macd.signal, -m, m, PRICE_H + GAP, OSC_H),
            zero,
          };
        })()
      : null;

    return {
      candleGeo,
      bodyW,
      overlay: view.overlay ? toPath(view.overlay, lo, hi, 0, PRICE_H) : null,
      osc: view.osc ? toPath(view.osc, 0, 100, PRICE_H + GAP, OSC_H) : null,
      oscLine: (level: number) => yOf(level, 0, 100, PRICE_H + GAP, OSC_H),
      bands: bandPaths,
      macd: macdPane,
    };
  }, [chartW, view]);

  // ---- knob fraction handler (identical to mobile) ----
  const setFromFrac = useCallback(
    (frac: number) => {
      let val = knob.min + frac * (knob.max - knob.min);
      if (knob.kind === "param") val = Math.round(val);
      setKnobValue(val);
    },
    [knob],
  );

  const frac = (knobValue - knob.min) / (knob.max - knob.min || 1);
  const step = lesson.steps[stepIndex];
  const isLast = stepIndex >= lesson.steps.length - 1;
  const gateBlocked = !!step.gate && !step.gate(knobValue);

  const advance = useCallback(() => {
    if (isLast) {
      onComplete?.();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, lesson.steps.length - 1));
  }, [isLast, lesson.steps.length, onComplete]);

  const handleCta = useCallback(() => {
    onComplete?.();
    onCtaToLab?.({ indicator: lesson.indicator, knob: knobValue, symbol: lesson.data.symbol });
  }, [lesson, knobValue, onComplete, onCtaToLab]);

  const knobLabel =
    knob.kind === "param" ? `${knob.name}: ${Math.round(knobValue)}` : `${knob.name}: ${Math.round(frac * 100)}%`;
  const metric =
    lesson.indicator === "ema"
      ? `crossings: ${view.whip}`
      : lesson.indicator === "rsi"
        ? view.lastRsi != null
          ? `RSI ${Math.round(view.lastRsi)}${view.pinnedBars > 2 ? ` · pinned ${view.pinnedBars} bars` : ""}`
          : ""
        : lesson.indicator === "macd"
          ? (() => {
              const h = view.macd?.histogram[view.macd.histogram.length - 1];
              return h == null ? "" : `hist ${h >= 0 ? "+" : ""}${h.toFixed(2)}`;
            })()
          : (() => {
              const i = (view.bands?.upper.length ?? 0) - 1;
              const u = view.bands?.upper[i];
              const l = view.bands?.lower[i];
              return u != null && l != null ? `bandwidth ${(u - l).toFixed(1)}` : "";
            })();

  return (
    <div className="rounded-2xl bg-card p-4 border border-border">
      {/* eyebrow + title */}
      <p className="font-cap text-xs text-fg-secondary uppercase tracking-widest">{lesson.eyebrow}</p>
      <p className="font-serif text-xl text-fg-primary mt-1 mb-4">{lesson.title}</p>

      {/* Chart area — ref used for ResizeObserver width measurement */}
      <div
        ref={chartDivRef}
        className="relative rounded-xl overflow-hidden mb-6 bg-surface-sunken"
        style={{ minHeight: totalH }}
      >
        {chartW > 0 && paths && (
          <svg width={chartW} height={totalH} style={{ display: "block" }}>
            {/* RSI guide lines (30 / 70) and pane bg */}
            {isOsc && (
              <>
                <rect
                  x={0}
                  y={PRICE_H + GAP}
                  width={chartW}
                  height={OSC_H}
                  fill="hsl(var(--surface-sunken))"
                  rx={4}
                  opacity={0.5}
                />
                <line
                  x1={0}
                  x2={chartW}
                  y1={paths.oscLine(70)}
                  y2={paths.oscLine(70)}
                  stroke="hsl(var(--negative))"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.6}
                />
                <line
                  x1={0}
                  x2={chartW}
                  y1={paths.oscLine(30)}
                  y2={paths.oscLine(30)}
                  stroke="hsl(var(--positive))"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.6}
                />
              </>
            )}

            {/* Candles */}
            {paths.candleGeo.map((g, i) => {
              const col = g.up ? "hsl(var(--positive))" : "hsl(var(--negative))";
              return (
                <React.Fragment key={i}>
                  <line x1={g.x} x2={g.x} y1={g.yHigh} y2={g.yLow} stroke={col} strokeWidth={1} />
                  <rect
                    x={g.x - paths.bodyW / 2}
                    y={g.bodyTop}
                    width={paths.bodyW}
                    height={g.bodyH}
                    fill={col}
                    rx={1}
                  />
                </React.Fragment>
              );
            })}

            {/* Bollinger band overlay (price pane) */}
            {paths.bands && (
              <>
                <path
                  d={paths.bands.upper}
                  stroke="hsl(var(--accent-ink))"
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.7}
                />
                <path
                  d={paths.bands.middle}
                  stroke="hsl(var(--fg-secondary))"
                  strokeWidth={1}
                  fill="none"
                  strokeDasharray="3 4"
                />
                <path
                  d={paths.bands.lower}
                  stroke="hsl(var(--accent-ink))"
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0.7}
                />
              </>
            )}

            {/* EMA overlay */}
            {paths.overlay && (
              <path d={paths.overlay} stroke="hsl(var(--accent-deep))" strokeWidth={2.5} fill="none" />
            )}

            {/* RSI line */}
            {lesson.indicator === "rsi" && paths.osc && (
              <path d={paths.osc} stroke="hsl(var(--accent-ink))" strokeWidth={2} fill="none" />
            )}

            {/* MACD lower pane */}
            {paths.macd && (
              <>
                <rect
                  x={0}
                  y={PRICE_H + GAP}
                  width={chartW}
                  height={OSC_H}
                  fill="hsl(var(--surface-sunken))"
                  rx={4}
                  opacity={0.5}
                />
                <line
                  x1={0}
                  x2={chartW}
                  y1={paths.macd.zero}
                  y2={paths.macd.zero}
                  stroke="hsl(var(--border-strong))"
                  strokeWidth={1}
                />
                {paths.macd.bars.map((b, i) => (
                  <rect
                    key={i}
                    x={b.x - paths.macd!.bw / 2}
                    y={b.y}
                    width={paths.macd!.bw}
                    height={b.h}
                    fill={b.up ? "hsl(var(--positive))" : "hsl(var(--negative))"}
                    opacity={0.8}
                  />
                ))}
                <path d={paths.macd.line} stroke="hsl(var(--accent-ink))" strokeWidth={2} fill="none" />
                <path d={paths.macd.signal} stroke="hsl(var(--accent-deep))" strokeWidth={1.5} fill="none" />
              </>
            )}
          </svg>
        )}

        {/* Metric pill — positioned top-right over the chart */}
        <div className="absolute top-2 right-2 rounded-full bg-card border border-border px-2 py-0.5">
          <span className="font-cap text-[11px] text-fg-secondary">{metric}</span>
        </div>
      </div>

      {/* Knob slider */}
      <KnobSlider label={knobLabel} frac={Math.max(0, Math.min(1, frac))} onFrac={setFromFrac} />

      {/* Guided tour */}
      <LessonTour
        copy={step.copy}
        total={lesson.steps.length}
        active={stepIndex}
        isLast={isLast}
        gateBlocked={gateBlocked}
        gateHint={step.gateHint}
        ctaLabel={isLast ? lesson.cta : "Next"}
        onNext={advance}
        onCta={handleCta}
      />
    </div>
  );
}
