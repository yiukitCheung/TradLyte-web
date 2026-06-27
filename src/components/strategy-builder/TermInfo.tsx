/**
 * TermInfo — the inline "what's this?" explainer used across the Strategy Lab.
 * One affordance, backed by the shared glossary: plain-language definition, an
 * optional mini illustration, and a "Try it" link that opens the matching
 * interactive lesson in a drawer (when one exists).
 */
import { Info } from "lucide-react";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { glossary } from "@/lib/strategyGlossary";
import { useLessonDrawer } from "./LessonDrawer";
import {
  RsiVisual,
  CrossoverVisual,
  CandleVisual,
  PriceCrossVisual,
  BracketVisual,
} from "./StrategyLabVisuals";

function MiniVisual({ name }: { name?: string }) {
  switch (name) {
    case "rsi":
      return <RsiVisual active />;
    case "crossover":
      return <CrossoverVisual active />;
    case "candle":
      return <CandleVisual active />;
    case "priceCross":
      return <PriceCrossVisual active />;
    case "bracket":
      return <BracketVisual active />;
    default:
      return null;
  }
}

export default function TermInfo({ termKey, className }: { termKey: string; className?: string }) {
  const entry = glossary(termKey);
  const { openLesson, hasLesson } = useLessonDrawer();
  if (!entry) return null;

  const canTry = hasLesson(entry.lessonId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What is ${entry.term}?`}
          className={
            "inline-flex h-4 w-4 shrink-0 items-center justify-center align-middle text-fg-muted transition-colors hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 " +
            (className ?? "")
          }
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl border-border-subtle p-0">
        <div className="flex flex-col gap-3 p-5">
          <p className="font-serif text-lg font-medium text-fg-primary">{entry.term}</p>
          {entry.visual && (
            <div className="flex justify-center rounded-xl bg-surface-sunken/60 py-4">
              <MiniVisual name={entry.visual} />
            </div>
          )}
          <p className="text-[14px] leading-relaxed text-fg-secondary">{entry.plain}</p>
          {canTry && entry.lessonId && (
            <button
              type="button"
              onClick={() => openLesson(entry.lessonId as string)}
              className="mt-1 inline-flex w-fit items-center gap-1.5 font-cap text-[13px] font-semibold text-ink transition-colors hover:text-gold-deep"
            >
              Try it →
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
