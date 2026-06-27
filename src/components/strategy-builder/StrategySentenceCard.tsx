/**
 * The living strategy sentence — the Lab's signature surface. Reads like English,
 * updates as the user builds, and every highlighted term is a "what's this?"
 * explainer. This same text is what gets saved.
 */
import { RotateCcw, Bookmark } from "lucide-react";

import { buildStrategySentence } from "@/lib/strategySentence";
import { glossary } from "@/lib/strategyGlossary";
import type { StrategyDraft } from "@/lib/strategyDraft";
import TermInfo from "./TermInfo";

export default function StrategySentenceCard({
  draft,
  onReset,
  onSave,
  canSave,
  compact,
}: {
  draft: StrategyDraft;
  onReset?: () => void;
  onSave?: () => void;
  canSave?: boolean;
  compact?: boolean;
}) {
  const segments = buildStrategySentence(draft);

  return (
    <div className={compact ? "rounded-2xl border border-border-subtle bg-card p-5" : "rounded-3xl border border-border-subtle bg-card p-6 md:p-8"}>
      <div className="flex items-start justify-between gap-4">
        <p className="font-cap text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep">Your strategy</p>
        <div className="flex shrink-0 items-center gap-2">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-1.5 font-cap text-xs font-semibold text-fg-primary transition-colors hover:border-ink disabled:opacity-40"
            >
              <Bookmark className="h-3.5 w-3.5" /> Save
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-1.5 font-cap text-xs font-medium text-fg-muted transition-colors hover:border-ink hover:text-fg-primary"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
      </div>
      <p
        className={
          compact
            ? "mt-3 font-serif text-[18px] leading-[1.55] text-fg-secondary"
            : "mt-4 font-serif text-[22px] leading-[1.5] text-fg-secondary md:text-[26px] md:leading-[1.5]"
        }
      >
        {segments.map((seg, i) => {
          const hasTerm = seg.term && glossary(seg.term);
          return (
            <span key={i} className={seg.strong ? "font-medium text-fg-primary" : undefined}>
              {hasTerm ? (
                <span className="whitespace-nowrap">
                  <span className="underline decoration-gold/50 decoration-dotted underline-offset-4">{seg.text}</span>
                  <TermInfo termKey={seg.term as string} className="ml-1" />
                </span>
              ) : (
                seg.text
              )}
            </span>
          );
        })}
      </p>
    </div>
  );
}
