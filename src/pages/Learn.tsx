/**
 * Indicator Lab — interactive "drag-to-understand" lessons (web route /learn).
 *
 * Sequences five surfaces: (0) CandleAnatomy primer, then (1–4) IndicatorPlayground
 * lessons (EMA sensitivity → RSI saturation → MACD momentum → Bollinger squeeze).
 * Each indicator lesson's CTA seeds a StrategyDraft from what the user just explored
 * and hands it to the Strategy Lab via navigate("/strategy-builder", { state }).
 * Bollinger and the candle primer soft-finish (no Lab handoff).
 *
 * Port of TradLyte-app/app/learn.tsx — RN layout replaced with Tailwind/web,
 * requestBacktest + router.back() replaced with navigate("/strategy-builder", { state }).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import IndicatorPlayground, { type PlaygroundState } from "@/components/education/IndicatorPlayground";
import CandleAnatomy from "@/components/education/CandleAnatomy";
import { lesson01Ema, lesson02Rsi, lesson03Macd, lesson04Bollinger } from "@/components/education/lessons";
import { clampMaPeriod, defaultStrategyDraft, type StrategyDraft } from "@/lib/strategyDraft";

// ---------------------------------------------------------------------------
// Surface discriminated union + order
// ---------------------------------------------------------------------------

type Surface = { kind: "candle" } | { kind: "indicator"; lesson: typeof lesson01Ema };

const ORDER: Surface[] = [
  { kind: "candle" },
  { kind: "indicator", lesson: lesson01Ema },
  { kind: "indicator", lesson: lesson02Rsi },
  { kind: "indicator", lesson: lesson03Macd },
  { kind: "indicator", lesson: lesson04Bollinger },
];

// The sample lessons run on synthetic data; hand the Lab a real liquid symbol.
const HANDOFF_SYMBOL = "AAPL";

// ---------------------------------------------------------------------------
// draftFromLesson — verbatim port from mobile learn.tsx
// ---------------------------------------------------------------------------

/** Map what the user explored into a runnable StrategyDraft. */
function draftFromLesson(state: PlaygroundState): StrategyDraft {
  const draft = defaultStrategyDraft();
  if (state.indicator === "ema" || state.indicator === "macd") {
    const fast = state.indicator === "macd" ? 12 : clampMaPeriod(state.knob);
    const slow = state.indicator === "macd" ? 26 : clampMaPeriod(Math.max(fast + 5, Math.round(fast * 2.5)));
    draft.strategyName = state.indicator === "macd" ? "macd_from_lesson" : "ema_from_lesson";
    draft.setup = {
      ...draft.setup,
      mode: "indicator",
      kind: "ma_crossover",
      fastType: "EMA",
      fastPeriod: fast,
      slowType: "EMA",
      slowPeriod: slow,
    };
  } else {
    draft.strategyName = "rsi_from_lesson";
    draft.setup = {
      ...draft.setup,
      mode: "indicator",
      kind: "rsi",
      indicator: "RSI",
      period: 14,
      operator: ">",
      threshold: 50,
    };
    // The lesson's closing point: confirm the momentum read with another signal.
    draft.trigger = { ...draft.trigger, mode: "candle_pattern", pattern: "BULLISH_ENGULFING" };
  }
  return draft;
}

// ---------------------------------------------------------------------------
// Learn page
// ---------------------------------------------------------------------------

const Learn = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const surface = ORDER[idx];
  const isLastLesson = idx >= ORDER.length - 1;

  // Bollinger + candle primer soft-finish (no Lab handoff); others hand off.
  const handsOff = surface.kind === "indicator" && surface.lesson.indicator !== "bollinger";

  const goToLab = (state: PlaygroundState) => {
    navigate("/strategy-builder", { state: { draft: draftFromLesson(state), symbol: HANDOFF_SYMBOL } });
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      {/* Top bar: back button + 5-segment progress */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface-primary/95 px-6 py-3 backdrop-blur-sm md:px-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        {/* 5-segment progress bar */}
        <div className="flex items-center gap-1.5">
          {ORDER.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-6 rounded-full transition-colors ${i <= idx ? "bg-gold-deep" : "bg-border-strong"}`}
            />
          ))}
        </div>
      </div>

      {/* Page header */}
      <div className="mx-auto w-full max-w-[860px] px-6 pt-10 md:px-10">
        <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
          Indicator Lab
        </p>
        <h1 className="mt-2 font-serif text-[32px] font-medium leading-tight text-fg-primary">
          Learn by doing
        </h1>
        <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-fg-secondary">
          Five interactive lessons — drag the controls and watch the math react live. No formulas, no lectures.
        </p>
      </div>

      {/* Main content */}
      <main className="mx-auto w-full max-w-[860px] flex-1 px-6 pb-20 pt-8 md:px-10">
        {surface.kind === "candle" ? (
          <CandleAnatomy onComplete={() => {}} />
        ) : (
          <IndicatorPlayground
            key={surface.lesson.id}
            lesson={surface.lesson}
            onCtaToLab={handsOff ? goToLab : undefined}
            onComplete={() => {}}
          />
        )}

        {/* "Next lesson" control — hidden on the last surface */}
        {!isLastLesson && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setIdx((i) => Math.min(i + 1, ORDER.length - 1))}
              className="rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold text-fg-secondary transition-colors hover:border-border-strong hover:bg-surface-sunken hover:text-fg-primary"
            >
              Next lesson →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Learn;
