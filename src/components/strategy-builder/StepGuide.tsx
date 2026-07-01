import { cn } from "@/lib/utils";

type Step = "setup" | "entry" | "exit";
const ORDER: Step[] = ["setup", "entry", "exit"];
const COPY: Record<Step, { title: string; lead: string }> = {
  setup: {
    title: "Setup — when is the market worth watching?",
    lead: "Pick one condition that must be true before you'll consider buying, or choose no filter to rely on your entry alone.",
  },
  entry: {
    title: "Entry — what pulls the trigger?",
    lead: "Choose the exact event that opens a position once your setup is in play.",
  },
  exit: {
    title: "Exit — when do you get out?",
    lead: "Set how a winning or losing trade is closed. Combine rules and whichever fires first wins.",
  },
};

export default function StepGuide({ step }: { step: Step }) {
  const idx = ORDER.indexOf(step);
  const { title, lead } = COPY[step];
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-border-subtle bg-gold/[0.04] px-4 py-3.5">
      <div className="flex flex-shrink-0 gap-1.5">
        {ORDER.map((s, i) => (
          <span
            key={s}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full font-cap text-[12px] font-semibold",
              i === idx ? "bg-ink text-white" : i < idx ? "bg-gold/20 text-gold-deep" : "border border-border-strong text-fg-muted",
            )}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <div>
        <p className="font-cap text-[13px] font-semibold text-fg-primary">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-fg-secondary">{lead}</p>
      </div>
    </div>
  );
}
