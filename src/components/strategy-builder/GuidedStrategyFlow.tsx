import { cn } from "@/lib/utils";
import { ArrowRight, ChevronLeft } from "lucide-react";
import type { StrategyDraft, MaType, SetupKind } from "@/lib/strategyDraft";
import { CANDLE_PATTERNS, suggestedMaPeriods, clampMaPeriod } from "@/lib/strategyDraft";
import {
  CandleVisual,
  CandlePatternVisual,
  CANDLE_PATTERN_META,
  CrossoverVisual,
  ExitVisual,
  OpenMarketVisual,
  PriceCrossVisual,
  RsiVisual,
} from "./StrategyLabVisuals";

type PatchSetup = (p: Partial<StrategyDraft["setup"]>) => void;
type PatchTrigger = (p: Partial<StrategyDraft["trigger"]>) => void;
type PatchExit = (p: Partial<StrategyDraft["exit"]>) => void;

const ChoiceCard = ({
  selected,
  onClick,
  title,
  description,
  visual,
  className,
  delay = 0,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  visual?: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <button
    type="button"
    onClick={onClick}
    style={{ animationDelay: `${delay}ms` }}
    className={cn(
      "group stagger-fade flex w-full flex-col items-start gap-6 rounded-3xl border bg-card p-8 text-left transition-all duration-300",
      selected
        ? "border-2 border-gold shadow-[0_8px_40px_-12px_hsl(var(--accent)/0.35)]"
        : "border-border-subtle hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm",
      className,
    )}
  >
    {visual && (
      <div className={cn("transition-transform duration-500", selected && "scale-105")}>{visual}</div>
    )}
    <div className="flex flex-col gap-2">
      <span className="font-serif text-xl font-medium text-fg-primary md:text-2xl">{title}</span>
      <span className="max-w-md text-[15px] leading-relaxed text-fg-secondary">{description}</span>
    </div>
  </button>
);

const Chip = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "rounded-full px-5 py-2.5 font-cap text-sm font-medium transition-all duration-200",
      selected ? "bg-ink text-white" : "border border-border-subtle bg-surface-primary text-fg-secondary hover:border-gold/50",
    )}
  >
    {label}
  </button>
);

const SectionReveal = ({ children, show }: { children: React.ReactNode; show: boolean }) =>
  show ? <div className="animate-slide-in flex flex-col gap-8">{children}</div> : null;

export function GuidedSetupStep({
  draft,
  patchSetup,
  onContinue,
  canContinue,
}: {
  draft: StrategyDraft;
  patchSetup: PatchSetup;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const isRsi = draft.setup.mode === "indicator" && draft.setup.kind === "rsi";
  const isMaTrend = draft.setup.mode === "indicator" && draft.setup.kind === "ma_crossover";

  const maSideEditor = (side: "fast" | "slow") => {
    const isFast = side === "fast";
    const typeKey = isFast ? "fastType" : "slowType";
    const periodKey = isFast ? "fastPeriod" : "slowPeriod";
    const maType = draft.setup[typeKey];
    const period = draft.setup[periodKey];
    return (
      <div className="flex flex-col gap-4">
        <span className="font-cap text-xs uppercase tracking-wide text-fg-muted">
          {isFast ? "Fast" : "Slow"} average
        </span>
        <div className="flex flex-wrap gap-2">
          {(["EMA", "SMA"] as MaType[]).map((t) => (
            <Chip
              key={t}
              label={t}
              selected={maType === t}
              onClick={() => patchSetup({ [typeKey]: t })}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={2}
            max={500}
            value={period}
            onChange={(e) => patchSetup({ [periodKey]: clampMaPeriod(Number(e.target.value)) })}
            className="w-24 rounded-xl border border-border-strong bg-card px-4 py-3 text-center font-serif text-xl text-fg-primary outline-none focus:border-ink"
          />
          <span className="font-cap text-sm text-fg-muted">days</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedMaPeriods(maType).map((p) => (
            <Chip
              key={p}
              label={`${p}`}
              selected={period === p}
              onClick={() => patchSetup({ [periodKey]: p })}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-4">
      <div className="flex flex-col gap-4 text-center">
        <p className="font-cap text-xs uppercase tracking-[0.2em] text-gold-deep">Step 1 · Your lens</p>
        <h2 className="font-serif text-3xl font-medium text-fg-primary md:text-4xl">
          What market regime should qualify?
        </h2>
        <p className="mx-auto max-w-lg text-[17px] leading-relaxed text-fg-secondary">
          Setup filters the environment — only days when this condition is true can lead to a trade.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <ChoiceCard
          selected={draft.setup.mode === "none"}
          onClick={() => patchSetup({ mode: "none" })}
          title="No filter"
          description="Every day is eligible. Your entry signal alone decides when to buy."
          visual={<OpenMarketVisual active={draft.setup.mode === "none"} />}
        />
        <ChoiceCard
          selected={isRsi}
          onClick={() =>
            patchSetup({
              mode: "indicator",
              kind: "rsi" as SetupKind,
              indicator: "RSI",
              period: 14,
              operator: ">",
              threshold: 50,
            })
          }
          title="Momentum check (RSI)"
          description="Only trade when RSI confirms strength — e.g. above 50 on a daily chart."
          visual={<RsiVisual level={draft.setup.threshold} active={isRsi} />}
          delay={90}
        />
        <ChoiceCard
          selected={isMaTrend}
          onClick={() =>
            patchSetup({
              mode: "indicator",
              kind: "ma_crossover" as SetupKind,
              fastType: "EMA",
              fastPeriod: 8,
              slowType: "EMA",
              slowPeriod: 21,
            })
          }
          title="Trend filter (moving averages)"
          description="Only trade when the fast average sits above the slow — an uptrend regime."
          visual={<CrossoverVisual active={isMaTrend} />}
          delay={180}
        />
      </div>

      <SectionReveal show={isRsi}>
        <div className="rounded-3xl border border-border-subtle bg-surface-sunken/60 p-10">
          <p className="font-cap text-xs uppercase tracking-[0.16em] text-fg-muted">RSI condition</p>
          <p className="mt-3 font-serif text-2xl text-fg-primary">When is momentum strong enough?</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { label: "Balanced (above 50)", threshold: 50, op: ">" as const },
              { label: "Cautious (above 55)", threshold: 55, op: ">" as const },
              { label: "Aggressive (above 40)", threshold: 40, op: ">" as const },
            ].map((opt) => (
              <Chip
                key={opt.label}
                label={opt.label}
                selected={draft.setup.threshold === opt.threshold && draft.setup.operator === opt.op}
                onClick={() => patchSetup({ threshold: opt.threshold, operator: opt.op, period: 14 })}
              />
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <RsiVisual level={draft.setup.threshold} active />
          </div>
        </div>
      </SectionReveal>

      <SectionReveal show={isMaTrend}>
        <div className="rounded-3xl border border-border-subtle bg-surface-sunken/60 p-10">
          <p className="font-serif text-2xl text-fg-primary">Shape your trend filter</p>
          <p className="mt-2 text-[15px] text-fg-secondary">
            Fast average must stay above the slow — pick any periods (2–500 days).
          </p>
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            {maSideEditor("fast")}
            {maSideEditor("slow")}
          </div>
          <div className="mt-10 flex justify-center">
            <CrossoverVisual active />
          </div>
        </div>
      </SectionReveal>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="group flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Continue <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

export function GuidedTriggerStep({
  draft,
  patchTrigger,
  onBack,
  onContinue,
}: {
  draft: StrategyDraft;
  patchTrigger: PatchTrigger;
  onBack: () => void;
  onContinue: () => void;
}) {
  const mode = draft.trigger.mode;

  const triggerOptions: Array<{
    id: StrategyDraft["trigger"]["mode"];
    title: string;
    description: string;
    visual: React.ReactNode;
    apply: Partial<StrategyDraft["trigger"]>;
  }> = [
    {
      id: "none",
      title: "No extra entry rule",
      description: "When your lens passes, enter on the next green candle — simple and permissive.",
      visual: <OpenMarketVisual active={mode === "none"} />,
      apply: { mode: "none" },
    },
    {
      id: "candle_pattern",
      title: "A candle pattern appears",
      description: "Wait for a recognizable bullish shape — engulfing, hammer, morning star, and more.",
      visual: <CandleVisual active={mode === "candle_pattern"} />,
      apply: { mode: "candle_pattern", pattern: "BULLISH_ENGULFING" },
    },
    {
      id: "price_level",
      title: "Price crosses a level",
      description: "Enter when price breaks above (or below) a dollar level you set.",
      visual: <PriceCrossVisual active={mode === "price_level"} />,
      apply: { mode: "price_level", priceLevel: 100, priceDirection: "ABOVE" },
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-4">
      <div className="flex flex-col gap-4 text-center">
        <p className="font-cap text-xs uppercase tracking-[0.2em] text-gold-deep">Step 2 · Entry signal</p>
        <h2 className="font-serif text-3xl font-medium text-fg-primary md:text-4xl">What tells you to buy?</h2>
        <p className="mx-auto max-w-lg text-[17px] leading-relaxed text-fg-secondary">
          The trigger fires only when your lens is already valid — candle pattern, price break, or no extra rule.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {triggerOptions.map((opt, i) => (
          <ChoiceCard
            key={opt.id}
            selected={mode === opt.id}
            onClick={() => patchTrigger(opt.apply)}
            title={opt.title}
            description={opt.description}
            visual={opt.visual}
            delay={i * 70}
          />
        ))}
      </div>

      <SectionReveal show={mode === "candle_pattern"}>
        <div className="rounded-3xl border border-border-subtle bg-surface-sunken/60 p-8 md:p-10">
          <p className="font-serif text-2xl text-fg-primary">Which pattern?</p>
          <p className="mt-2 text-[15px] text-fg-secondary">
            Each shape is a different story the price told that day. Pick the one to wait for.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CANDLE_PATTERNS.map((p) => {
              const selected = draft.trigger.pattern === p.value;
              const meta = CANDLE_PATTERN_META[p.value];
              const biasTone =
                meta?.bias === "Bullish" ? "text-positive" : meta?.bias === "Bearish" ? "text-negative" : "text-fg-muted";
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => patchTrigger({ pattern: p.value })}
                  aria-pressed={selected}
                  className={cn(
                    "group flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-all duration-200",
                    selected
                      ? "border-2 border-gold shadow-[0_6px_28px_-12px_hsl(var(--accent)/0.4)]"
                      : "border-border-subtle hover:-translate-y-0.5 hover:border-border-strong",
                  )}
                >
                  <div className="flex h-16 items-end justify-center">
                    <CandlePatternVisual pattern={p.value} active={selected} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-medium text-fg-primary">{p.label}</span>
                      {meta && <span className={cn("font-cap text-[11px] font-semibold", biasTone)}>{meta.bias}</span>}
                    </div>
                    {meta && <span className="text-[13px] leading-snug text-fg-secondary">{meta.meaning}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal show={mode === "price_level"}>
        <div className="rounded-3xl border border-border-subtle bg-surface-sunken/60 p-10">
          <p className="font-serif text-2xl text-fg-primary">Price level break</p>
          <p className="mt-2 text-[15px] text-fg-secondary">Enter when price crosses the level you set.</p>
          <div className="mt-8 flex flex-col gap-6">
            <div className="flex flex-wrap gap-3">
              {(["ABOVE", "BELOW"] as const).map((dir) => (
                <Chip
                  key={dir}
                  label={dir === "ABOVE" ? "Cross above" : "Cross below"}
                  selected={draft.trigger.priceDirection === dir}
                  onClick={() => patchTrigger({ priceDirection: dir })}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-cap text-sm text-fg-muted">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.trigger.priceLevel}
                onChange={(e) => patchTrigger({ priceLevel: Number(e.target.value) })}
                className="w-full max-w-xs rounded-xl border border-border-strong bg-card px-4 py-3 font-serif text-xl text-fg-primary outline-none focus:border-ink"
                placeholder="e.g. 150"
              />
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <PriceCrossVisual active />
          </div>
        </div>
      </SectionReveal>

      <div className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} className="flex items-center gap-2 font-cap text-sm text-fg-muted hover:text-fg-primary">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button type="button" onClick={onContinue} className="group flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90">
          Continue <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

const EXIT_OPTIONS: Array<{
  id: StrategyDraft["exit"]["mode"];
  title: string;
  description: string;
  visual: (active: boolean) => React.ReactNode;
}> = [
  {
    id: "bracket",
    title: "Target and stop together",
    description: "A profit target above and a stop below — whichever price hits first ends the trade. The balanced default.",
    visual: (a) => <ExitVisual kind="bracket" active={a} />,
  },
  {
    id: "take_profit",
    title: "Take profit only",
    description: "One line above your entry — exit the moment gain reaches your target. Simple and optimistic.",
    visual: (a) => <ExitVisual kind="take_profit" active={a} />,
  },
  {
    id: "stop_loss",
    title: "Stop loss only",
    description: "One line below your entry — exit if loss reaches your limit. Caps the downside, lets gains run.",
    visual: (a) => <ExitVisual kind="stop_loss" active={a} />,
  },
  {
    id: "trailing",
    title: "Trailing stop",
    description: "The stop ratchets up as price climbs, then catches the pullback — let winners run, lock in the rise.",
    visual: (a) => <ExitVisual kind="trailing" active={a} />,
  },
  {
    id: "time",
    title: "Time limit",
    description: "Close after a set number of days, win or lose — the calendar decides, not the price.",
    visual: (a) => <ExitVisual kind="time" active={a} />,
  },
  {
    id: "death_cross",
    title: "Signal flips bearish",
    description: "Exit when the fast average crosses back below the slow — the mirror of your entry logic.",
    visual: (a) => <ExitVisual kind="death_cross" active={a} />,
  },
];

export function GuidedExitStep({
  draft,
  patchExit,
  onBack,
  onContinue,
  canContinue,
}: {
  draft: StrategyDraft;
  patchExit: PatchExit;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  const mode = draft.exit.mode;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 py-4">
      <div className="flex flex-col gap-4 text-center">
        <p className="font-cap text-xs uppercase tracking-[0.2em] text-gold-deep">Step 3 · Exit plan</p>
        <h2 className="font-serif text-3xl font-medium text-fg-primary md:text-4xl">How should the trade end?</h2>
        <p className="mx-auto max-w-lg text-[17px] leading-relaxed text-fg-secondary">
          Every strategy needs an exit. Choose what closes the position — profit, loss, time, or a reversal.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {EXIT_OPTIONS.map((opt, i) => (
          <ChoiceCard
            key={opt.id}
            selected={mode === opt.id}
            onClick={() => patchExit({ mode: opt.id })}
            title={opt.title}
            description={opt.description}
            visual={opt.visual(mode === opt.id)}
            delay={i * 70}
          />
        ))}
      </div>

      <SectionReveal show={mode === "bracket" || mode === "take_profit" || mode === "stop_loss"}>
        <div className="rounded-3xl border border-border-subtle bg-surface-sunken/60 p-10">
          {(mode === "bracket" || mode === "take_profit") && (
            <div className="mb-10 flex flex-col gap-4">
              <span className="font-serif text-xl text-fg-primary">Take profit at</span>
              <div className="flex flex-wrap gap-3">
                {[5, 10, 15, 20].map((v) => (
                  <Chip key={v} label={`+${v}%`} selected={draft.exit.takeProfitPct === v} onClick={() => patchExit({ takeProfitPct: v })} />
                ))}
              </div>
            </div>
          )}
          {(mode === "bracket" || mode === "stop_loss") && (
            <div className="flex flex-col gap-4">
              <span className="font-serif text-xl text-fg-primary">Stop loss at</span>
              <div className="flex flex-wrap gap-3">
                {[3, 5, 8, 10].map((v) => (
                  <Chip key={v} label={`−${v}%`} selected={draft.exit.stopLossPct === v} onClick={() => patchExit({ stopLossPct: v })} />
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionReveal>

      <SectionReveal show={mode === "trailing"}>
        <div className="rounded-3xl border border-border-subtle bg-surface-sunken/60 p-10">
          <span className="font-serif text-xl text-fg-primary">Trail by</span>
          <div className="mt-6 flex flex-wrap gap-3">
            {[2, 3, 5, 8].map((v) => (
              <Chip key={v} label={`${v}% from peak`} selected={draft.exit.trailingStopPct === v} onClick={() => patchExit({ trailingStopPct: v })} />
            ))}
          </div>
        </div>
      </SectionReveal>

      <SectionReveal show={mode === "time"}>
        <div className="rounded-3xl border border-border-subtle bg-surface-sunken/60 p-10">
          <span className="font-serif text-xl text-fg-primary">Hold at most</span>
          <div className="mt-6 flex flex-wrap gap-3">
            {[5, 10, 20, 30].map((v) => (
              <Chip key={v} label={`${v} days`} selected={draft.exit.maxHoldingDays === v} onClick={() => patchExit({ maxHoldingDays: v })} />
            ))}
          </div>
        </div>
      </SectionReveal>

      <div className="flex items-center justify-between pt-4">
        <button type="button" onClick={onBack} className="flex items-center gap-2 font-cap text-sm text-fg-muted hover:text-fg-primary">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button
          type="button"
          disabled={!canContinue}
          onClick={onContinue}
          className="group flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          See how it would have done <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
