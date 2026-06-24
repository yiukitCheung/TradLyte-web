export interface LessonTourProps {
  copy: string;
  total: number;
  active: number;
  isLast: boolean;
  gateBlocked: boolean;
  gateHint?: string;
  ctaLabel: string;
  onNext: () => void;
  onCta: () => void;
}

export default function LessonTour({ copy, total, active, isLast, gateBlocked, gateHint, ctaLabel, onNext, onCta }: LessonTourProps) {
  return (
    <div className="border-t border-border pt-6">
      <p className="min-h-[66px] font-sans text-base text-fg-primary">{copy}</p>
      {isLast ? (
        <button onClick={onCta} className="mt-3 self-start rounded-full bg-ink px-6 py-3 font-sans text-sm font-semibold text-fg-inverse">
          {ctaLabel}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={gateBlocked}
          className={`mt-3 self-start rounded-full px-6 py-3 font-sans text-sm font-semibold ${gateBlocked ? "bg-surface-sunken text-fg-muted" : "bg-ink text-fg-inverse"}`}
        >
          {gateBlocked ? (gateHint ?? "Try the slider") : "Next"}
        </button>
      )}
      <div className="mt-6 flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full ${i === active ? "w-[18px] bg-gold-deep" : "w-1.5 bg-border-strong"}`} />
        ))}
      </div>
    </div>
  );
}
