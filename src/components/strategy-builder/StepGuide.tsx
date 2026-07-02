/**
 * StepGuide — the merged stepper + tabs for the single-test flow.
 * One row of three question cells; each cell shows the user's CURRENT ANSWER
 * in serif, so the navigation doubles as a live summary of the strategy
 * being built. Clicking a cell jumps to that question.
 */
import { cn } from "@/lib/utils";
import { CANDLE_PATTERNS, type StrategyDraft } from "@/lib/strategyDraft";

type Step = "setup" | "entry" | "exit";
const ORDER: Step[] = ["setup", "entry", "exit"];

/** The question each step answers — rendered as the card header in the panel. */
export const STEP_QUESTIONS: Record<Step, string> = {
  setup: "When is the market worth watching?",
  entry: "What pulls the trigger?",
  exit: "When do you get out?",
};

export const STEP_HINTS: Record<Step, string> = {
  setup:
    "One condition that must be true before a buy is even considered — or no filter, and your entry alone decides. Hover any tile for a plain-English explainer.",
  entry: "The exact event that opens the position once your setup is in play.",
  exit: "Every position needs a way out before it goes in — set how winners and losers close.",
};

// --- plain-language answer summaries (presentation copy, not domain logic) ---

const OP_TEXT: Record<string, string> = {
  ">": "above",
  "<": "below",
  ">=": "at or above",
  "<=": "at or below",
  "==": "at",
  CROSS_ABOVE: "crossing above",
  CROSS_BELOW: "crossing below",
};

function operandText(o: { kind: string; indicator: string; period: number; output: string; value: number }): string {
  if (o.kind === "price") return "price";
  if (o.kind === "value") return String(o.value);
  const out = o.output ? ` ${o.output}` : "";
  return o.period ? `${o.indicator}(${o.period})${out}` : `${o.indicator}${out}`;
}

function setupSummary(d: StrategyDraft): string {
  const s = d.setup;
  if (s.mode === "none") return "No filter — every day qualifies";
  if (s.kind === "rsi") return `RSI ${OP_TEXT[s.operator] ?? s.operator} ${s.threshold}`;
  if (s.kind === "ma_crossover") return `${s.fastType} ${s.fastPeriod} above ${s.slowType} ${s.slowPeriod}`;
  const c = s.condition;
  if (!c) return "Custom condition";
  return `${operandText(c.left)} ${OP_TEXT[c.operator] ?? c.operator} ${operandText(c.right)}`;
}

function entrySummary(d: StrategyDraft): string {
  const t = d.trigger;
  if (t.mode === "none") return "On the setup edge";
  if (t.mode === "price_level") return `Price crosses $${t.priceLevel} ${t.priceDirection === "ABOVE" ? "up" : "down"}`;
  return CANDLE_PATTERNS.find((p) => p.value === t.pattern)?.label ?? "Candle pattern";
}

function exitSummary(d: StrategyDraft): string {
  const e = d.exit;
  switch (e.mode) {
    case "bracket":
      return `+${e.takeProfitPct}% target · −${e.stopLossPct}% stop`;
    case "take_profit":
      return `+${e.takeProfitPct}% target`;
    case "stop_loss":
      return `−${e.stopLossPct}% stop`;
    case "trailing":
      return `${e.trailingStopPct}% trailing stop`;
    case "time":
      return `Sell after ${e.maxHoldingDays} days`;
    case "death_cross":
      return "When the signal flips";
    case "indicator_cross":
      return `${e.exitIndicator ?? "RSI"} crosses ${e.exitDirection === "UP" ? "up" : "down"} through ${e.exitValue ?? 50}`;
    default: {
      const n = e.stack?.length ?? 0;
      return n ? `${n} rule${n === 1 ? "" : "s"} — first to fire wins` : "Combine rules";
    }
  }
}

const SUMMARY: Record<Step, (d: StrategyDraft) => string> = {
  setup: setupSummary,
  entry: entrySummary,
  exit: exitSummary,
};

export default function StepGuide({
  step,
  onStep,
  draft,
}: {
  step: Step;
  onStep: (s: Step) => void;
  draft: StrategyDraft;
}) {
  const idx = ORDER.indexOf(step);
  return (
    <div role="tablist" aria-label="Strategy steps" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {ORDER.map((s, i) => {
        const active = s === step;
        const past = i < idx;
        const summary = SUMMARY[s](draft);
        return (
          <button
            key={s}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onStep(s)}
            className={cn(
              "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200",
              active ? "border-gold bg-gold/[0.06]" : "border-border-subtle bg-card hover:border-border-strong",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full font-cap text-[12px] font-semibold",
                active
                  ? "bg-ink text-white"
                  : past
                    ? "bg-gold/20 text-gold-deep"
                    : "border border-border-strong text-fg-muted",
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block font-cap text-[11px] font-semibold uppercase tracking-wide",
                  active ? "text-fg-primary" : "text-fg-muted",
                )}
              >
                {s}
              </span>
              <span
                title={summary}
                className={cn(
                  "mt-0.5 block truncate font-serif text-[15px] leading-snug",
                  active ? "text-fg-primary" : "text-fg-secondary",
                )}
              >
                {summary}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
