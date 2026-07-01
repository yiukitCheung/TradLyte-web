// src/components/strategy-builder/IndicatorTile.tsx
import type { LucideIcon } from "lucide-react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { glossary } from "@/lib/strategyGlossary";
import TermInfo from "./TermInfo";
import { IndicatorScene } from "./StrategyLabVisuals";

export function IndicatorTile({
  selected, onClick, label, Icon, explainerKind, pattern, termKey, meaning,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  Icon?: LucideIcon;
  explainerKind: string;
  pattern?: string;
  termKey?: string;
  meaning?: string;
}) {
  const entry = termKey ? glossary(termKey) : undefined;
  const plain = meaning ?? entry?.plain;
  const hasScene = explainerKind !== "none";
  const showCard = hasScene || Boolean(plain);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          "relative flex min-h-[96px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border bg-card px-2 py-4 text-center transition-all duration-200",
          selected
            ? "border-2 border-gold bg-gold/[0.04] shadow-[0_6px_24px_-16px_hsl(var(--accent)/0.5)]"
            : "border-border-subtle hover:-translate-y-0.5 hover:border-border-strong",
        )}
      >
        {termKey && (
          <span className="absolute right-1.5 top-1.5" onClick={(e) => e.stopPropagation()}>
            <TermInfo termKey={termKey} />
          </span>
        )}
        {Icon && (
          <span className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
            selected ? "bg-gold/15 text-gold-deep" : "bg-surface-sunken text-fg-secondary group-hover:text-fg-primary",
          )}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
        )}
        <span className="text-[12.5px] font-medium leading-tight text-fg-primary">{label}</span>
      </button>

      {showCard && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-64 -translate-x-1/2 rounded-2xl border border-border-strong bg-card p-4 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
        >
          {hasScene && (
            <div className="mb-3 flex justify-center rounded-xl bg-surface-sunken/60 py-3">
              <IndicatorScene kind={explainerKind} pattern={pattern} active />
            </div>
          )}
          <p className="font-serif text-[15px] font-medium text-fg-primary">{entry?.term ?? label}</p>
          {plain && <p className="mt-1.5 text-[13px] leading-relaxed text-fg-secondary">{plain}</p>}
          <p className="mt-2 flex items-center gap-1.5 font-cap text-[11px] font-semibold text-gold-deep">
            <Play className="h-3 w-3" /> Highlights the entry it fires
          </p>
        </div>
      )}
    </div>
  );
}
