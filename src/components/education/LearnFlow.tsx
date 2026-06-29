/**
 * LearnFlow — the shared interactive lesson sequence (candle primer → EMA → RSI →
 * MACD → Bollinger). Rendered both by the full-page /learn route (with page chrome)
 * and embedded inside the Profile "Learning" tab. Page chrome (back bar, page
 * header, min-h-screen) lives in the host, not here.
 *
 * Each indicator lesson's CTA seeds a StrategyDraft from what the user just explored
 * and hands it to the Strategy Lab via navigate("/strategy-builder", { state }).
 * Bollinger and the candle primer soft-finish (no Lab handoff).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
// LearnFlow
// ---------------------------------------------------------------------------

export default function LearnFlow() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const surface = ORDER[idx];
  const isLastLesson = idx >= ORDER.length - 1;

  // Bollinger + candle primer soft-finish (no Lab handoff); others hand off.
  const handsOff = surface.kind === "indicator" && surface.lesson.indicator !== "bollinger";

  const goNext = () => setIdx((i) => Math.min(i + 1, ORDER.length - 1));

  const goToLab = (state: PlaygroundState) => {
    navigate("/strategy-builder", { state: { draft: draftFromLesson(state), symbol: HANDOFF_SYMBOL } });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 5-segment progress bar */}
      <div className="flex items-center justify-center gap-1.5">
        {ORDER.map((_, i) => (
          <div
            key={i}
            className={`h-1 w-6 rounded-full transition-colors ${i <= idx ? "bg-gold-deep" : "bg-border-strong"}`}
          />
        ))}
      </div>

      {surface.kind === "candle" ? (
        <CandleAnatomy onComplete={goNext} />
      ) : (
        <IndicatorPlayground
          key={surface.lesson.id}
          lesson={surface.lesson}
          onCtaToLab={handsOff ? goToLab : undefined}
          onComplete={handsOff ? undefined : goNext}
        />
      )}

      {/* "Next lesson" control — hidden on the last surface */}
      {!isLastLesson && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(i + 1, ORDER.length - 1))}
            className="rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold text-fg-secondary transition-colors hover:border-border-strong hover:bg-surface-sunken hover:text-fg-primary"
          >
            Next lesson →
          </button>
        </div>
      )}
    </div>
  );
}
