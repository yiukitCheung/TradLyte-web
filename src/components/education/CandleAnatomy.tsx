/**
 * CandleAnatomy — Lesson 0. Teaches how to read ONE candle: the body is
 * open->close (green when close >= open), the wicks are the high/low extremes.
 * The knob drives the close so the candle flips color and the body grows; gated
 * beats surface a doji (indecision) and the wicks (rejection). Multi-candle
 * patterns live in the Strategy Lab, not here.
 *
 * Web port of TradLyte-app/components/education/CandleAnatomy.tsx.
 * All constants, gates, STEPS copy, geometry (yOf), body/wick math, and state
 * are identical to mobile — only rendering primitives + styling have changed
 * (RN → DOM/SVG + Tailwind).
 *
 * Chart width is measured via a div ref + ResizeObserver (replacing RN's
 * onLayout/LayoutChangeEvent). The `chartW > 0` render guard is preserved so
 * the SVG is never drawn until a real width is available.
 *
 * SVG color props use "hsl(var(--token))" strings (never hardcoded hex):
 *   candle up/green  → hsl(var(--positive))
 *   candle down/red  → hsl(var(--negative))
 *   labels (H/L/O)   → hsl(var(--fg-secondary))
 *   Close label      → candle color (col)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import KnobSlider from "@/components/education/KnobSlider";
import LessonTour from "@/components/education/LessonTour";

const CHART_H = 260;
const OPEN_V = 50; // open price (fixed reference)
const HIGH_V = 92; // fixed illustrative wick extents
const LOW_V = 8;
const MIN_V = 0;
const MAX_V = 100;

const STEPS = [
  { id: "body", copy: "This single bar is a candle. The fat part — the body — runs from the OPEN (where the period started) to the CLOSE (where it ended)." },
  { id: "color", copy: "Drag the slider up: the close finishes above the open, so the body turns green — buyers won the session. Drag down and it turns red.", gate: (close: number) => close >= 70, gateHint: "Drag up so the candle closes higher" },
  { id: "conviction", copy: "A big body = conviction: price moved decisively. A small body = a near-tie." },
  { id: "doji", copy: "Now drag until the body almost vanishes — open ≈ close. That's a doji: indecision, a standoff between buyers and sellers.", gate: (close: number) => Math.abs(close - OPEN_V) <= 6, gateHint: "Drag until the body nearly disappears" },
  { id: "wicks", copy: "The thin lines are wicks: the HIGH and LOW — the most extreme prices touched. A long lower wick means buyers REJECTED lower prices and pushed back up (possible support); a long upper wick is sellers rejecting higher prices." },
  { id: "decision", copy: "So one candle already tells you four prices and who had control. Color = who won, body = conviction, wicks = where price got rejected. That's the alphabet behind every chart." },
];

export interface CandleAnatomyProps {
  onComplete?: () => void;
}

export default function CandleAnatomy({ onComplete }: CandleAnatomyProps) {
  const [closeV, setCloseV] = useState(35);
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

  const step = STEPS[stepIndex];
  const isLast = stepIndex >= STEPS.length - 1;
  const gateBlocked = !!step.gate && !step.gate(closeV);
  const up = closeV >= OPEN_V;

  const yOf = useCallback((v: number) => {
    const top = 28;
    const h = CHART_H - 56;
    return top + (1 - (v - MIN_V) / (MAX_V - MIN_V)) * h;
  }, []);

  const advance = useCallback(() => {
    if (isLast) {
      onComplete?.();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [isLast, onComplete]);

  const geo = useMemo(() => {
    const cx = chartW / 2;
    const bw = 64;
    const yO = yOf(OPEN_V);
    const yC = yOf(closeV);
    return {
      cx,
      bw,
      yHigh: yOf(HIGH_V),
      yLow: yOf(LOW_V),
      yOpen: yO,
      yClose: yC,
      bodyTop: Math.min(yO, yC),
      bodyH: Math.max(2, Math.abs(yC - yO)),
    };
  }, [chartW, closeV, yOf]);

  const col = up ? "hsl(var(--positive))" : "hsl(var(--negative))";
  const frac = (closeV - MIN_V) / (MAX_V - MIN_V);

  return (
    <div className="rounded-2xl bg-card p-4 border border-border">
      <p className="font-cap text-xs text-fg-secondary uppercase tracking-widest">Lesson 0 · Candles</p>
      <p className="font-serif text-xl text-fg-primary mt-1 mb-4">How to read one candle</p>

      {/* Chart area — ref used for ResizeObserver width measurement */}
      <div
        ref={chartDivRef}
        className="bg-background rounded-xl overflow-hidden mb-6"
        style={{ height: CHART_H }}
      >
        {chartW > 0 && (
          <svg width={chartW} height={CHART_H} style={{ display: "block" }}>
            {/* wick */}
            <line x1={geo.cx} x2={geo.cx} y1={geo.yHigh} y2={geo.yLow} stroke={col} strokeWidth={2} />
            {/* body */}
            <rect x={geo.cx - geo.bw / 2} y={geo.bodyTop} width={geo.bw} height={geo.bodyH} fill={col} rx={2} />
            {/* labels */}
            <text x={geo.cx + geo.bw / 2 + 10} y={geo.yHigh + 4} fill="hsl(var(--fg-secondary))" fontSize={12} textAnchor="start">High</text>
            <text x={geo.cx + geo.bw / 2 + 10} y={geo.yLow + 4} fill="hsl(var(--fg-secondary))" fontSize={12} textAnchor="start">Low</text>
            <text x={geo.cx - geo.bw / 2 - 10} y={geo.yOpen + 4} fill="hsl(var(--fg-secondary))" fontSize={12} textAnchor="end">Open</text>
            <text x={geo.cx - geo.bw / 2 - 10} y={geo.yClose + 4} fill={col} fontSize={12} textAnchor="end">Close</text>
          </svg>
        )}
      </div>

      <KnobSlider
        label={`Close: ${up ? "above" : "below"} open`}
        frac={Math.max(0, Math.min(1, frac))}
        onFrac={(f) => setCloseV(MIN_V + f * (MAX_V - MIN_V))}
      />

      <LessonTour
        copy={step.copy}
        total={STEPS.length}
        active={stepIndex}
        isLast={isLast}
        gateBlocked={gateBlocked}
        gateHint={step.gateHint}
        ctaLabel={isLast ? "Got it →" : "Start the lessons →"}
        onNext={advance}
        onCta={advance}
      />
    </div>
  );
}
