/**
 * The living strategy sentence — the Strategy Lab's signature element.
 *
 * Renders a StrategyDraft as plain English broken into segments. UI keeps the
 * structure (each glossary-linked term becomes a "what's this?" affordance);
 * `sentenceToString` flattens it for saving and summaries. DOM-free for reuse.
 */
import {
  CANDLE_PATTERNS,
  indicatorMeta,
  timeframeLabel,
  type ConditionOperand,
  type CompareOperator,
  type StrategyDraft,
} from "@/lib/strategyDraft";

export interface SentenceSegment {
  text: string;
  /** Glossary key — when set, UI may attach an inline explainer. */
  term?: string;
  /** Visually emphasised value (a number, indicator, level). */
  strong?: boolean;
}

const OP_WORDS: Record<CompareOperator, string> = {
  ">": "is above",
  "<": "is below",
  ">=": "is at or above",
  "<=": "is at or below",
  "==": "equals",
  CROSS_ABOVE: "crosses above",
  CROSS_BELOW: "crosses below",
};

function patternLabel(value: string): string {
  return CANDLE_PATTERNS.find((p) => p.value === value)?.label.toLowerCase() ?? "candle";
}

function operandText(op: ConditionOperand): { text: string; term?: string } {
  if (op.kind === "price") return { text: "price" };
  if (op.kind === "value") return { text: String(op.value) };
  const meta = indicatorMeta(op.indicator);
  if (meta.outputs) {
    const out = meta.outputs.find((o) => o.value === op.output)?.label ?? meta.label;
    const first = meta.label.split(" ")[0];
    const base = out.toLowerCase().startsWith(first.toLowerCase()) ? out : `${first} ${out}`;
    const suffix = meta.hasPeriod ? ` (${op.period})` : "";
    return { text: `${base}${suffix}`.trim(), term: op.indicator };
  }
  return { text: `${op.indicator}(${op.period})`, term: op.indicator };
}

function setupSegments(draft: StrategyDraft): SentenceSegment[] {
  const s = draft.setup;
  if (s.mode === "none") return [{ text: "with no setup filter, " }];

  const segs: SentenceSegment[] = [{ text: "when " }];
  switch (s.kind) {
    case "ma_crossover":
      segs.push({ text: `${s.fastType} ${s.fastPeriod}`, term: s.fastType, strong: true });
      segs.push({ text: " sits above " });
      segs.push({ text: `${s.slowType} ${s.slowPeriod}`, term: s.slowType, strong: true });
      break;
    case "indicator": {
      const cond = s.condition;
      if (cond) {
        const left = operandText(cond.left);
        const right = operandText(cond.right);
        segs.push({ text: left.text, term: left.term, strong: true });
        segs.push({ text: ` ${OP_WORDS[cond.operator]} ` });
        segs.push({ text: right.text, term: right.term, strong: true });
      } else {
        segs.push({ text: "the condition holds", strong: true });
      }
      break;
    }
    case "rsi":
    default:
      segs.push({ text: `RSI(${s.period})`, term: "RSI", strong: true });
      segs.push({ text: ` ${OP_WORDS[s.operator] ?? "is above"} ` });
      segs.push({ text: String(s.threshold), strong: true });
      break;
  }

  if (s.timeframe && s.timeframe !== draft.timeframe) {
    segs.push({ text: " on the " });
    segs.push({ text: timeframeLabel(s.timeframe), term: "multiTimeframe", strong: true });
    segs.push({ text: " chart" });
  }
  segs.push({ text: ", " });
  return segs;
}

function triggerSegments(draft: StrategyDraft): SentenceSegment[] {
  const t = draft.trigger;
  switch (t.mode) {
    case "candle_pattern":
      return [
        { text: "and a " },
        { text: patternLabel(t.pattern), term: "candlePattern", strong: true },
        { text: " prints, buy. " },
      ];
    case "price_level":
      return [
        { text: "and price crosses " },
        { text: t.priceDirection.toLowerCase(), term: "priceCrossover", strong: true },
        { text: " $" },
        { text: String(t.priceLevel), strong: true },
        { text: ", buy. " },
      ];
    case "none":
    default:
      return [{ text: "buy " }, { text: "on the setup edge", term: "setupEdge", strong: true }, { text: ". " }];
  }
}

function pct(n: number): string {
  return `${Math.round(Number(n) * 10) / 10}%`;
}

function exitSegments(draft: StrategyDraft): SentenceSegment[] {
  const e = draft.exit;
  switch (e.mode) {
    case "take_profit":
      return [{ text: "Exit at " }, { text: `+${pct(e.takeProfitPct)}`, term: "takeProfit", strong: true }, { text: "." }];
    case "stop_loss":
      return [{ text: "Exit on a " }, { text: pct(e.stopLossPct), term: "stopLoss", strong: true }, { text: " stop." }];
    case "trailing":
      return [
        { text: "Exit on a " },
        { text: pct(e.trailingStopPct), term: "trailingStop", strong: true },
        { text: " trailing stop." },
      ];
    case "time":
      return [
        { text: "Exit after " },
        { text: String(Math.max(1, Math.floor(e.maxHoldingDays))), term: "timeExit", strong: true },
        { text: " days." },
      ];
    case "death_cross":
      return [{ text: "Exit when the " }, { text: "trend flips bearish", term: "signalFlip", strong: true }, { text: "." }];
    case "indicator_cross": {
      const ind = e.exitIndicator ?? "RSI";
      const label = ind === "STOCH" ? "Stochastic" : `RSI(${e.exitPeriod ?? 14})`;
      const dir = (e.exitDirection ?? "DOWN") === "DOWN" ? "down through" : "up through";
      return [
        { text: "Exit when " },
        { text: label, term: ind, strong: true },
        { text: ` crosses ${dir} ` },
        { text: String(e.exitValue ?? 50), strong: true },
        { text: "." },
      ];
    }
    case "stack": {
      const rules = e.stack ?? [];
      const parts: SentenceSegment[] = [{ text: "Exit on whichever fires first: " }];
      rules.forEach((r, i) => {
        if (i > 0) parts.push({ text: i === rules.length - 1 ? ", or " : ", " });
        switch (r.kind) {
          case "take_profit":
            parts.push({ text: `+${pct(r.pct ?? 0)} target`, term: "takeProfit", strong: true });
            break;
          case "stop_loss":
            parts.push({ text: `${pct(r.pct ?? 0)} stop`, term: "stopLoss", strong: true });
            break;
          case "trailing":
            parts.push({ text: `${pct(r.pct ?? 0)} trailing stop`, term: "trailingStop", strong: true });
            break;
          case "signal_flip":
            parts.push({ text: "a bearish trend flip", term: "signalFlip", strong: true });
            break;
        }
      });
      parts.push({ text: "." });
      return parts;
    }
    case "bracket":
    default:
      return [
        { text: "Exit at " },
        { text: `+${pct(e.takeProfitPct)}`, term: "takeProfit", strong: true },
        { text: " or a " },
        { text: pct(e.stopLossPct), term: "stopLoss", strong: true },
        { text: " stop." },
      ];
  }
}

export function buildStrategySentence(draft: StrategyDraft): SentenceSegment[] {
  return [
    { text: "On the " },
    { text: timeframeLabel(draft.timeframe), term: "timeframe", strong: true },
    { text: " chart, " },
    ...setupSegments(draft),
    ...triggerSegments(draft),
    ...exitSegments(draft),
  ];
}

export function sentenceToString(segments: SentenceSegment[]): string {
  return segments
    .map((s) => s.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
