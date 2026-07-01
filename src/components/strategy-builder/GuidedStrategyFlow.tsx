import {
  Ban,
  Gauge,
  TrendingUp,
  Spline,
  Waves,
  LineChart,
  ChevronsUpDown,
  Vibrate,
  SlidersHorizontal,
  ArrowUpDown,
  Target,
  ShieldAlert,
  MoveUpRight,
  Clock,
  Repeat,
  Layers,
  Zap,
  CandlestickChart,
  Crosshair,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StrategyDraft,
  MaType,
  IndicatorId,
  CompareOperator,
  ConditionOperand,
  ExitRuleSpec,
  ExitLeafKind,
} from "@/lib/strategyDraft";
import {
  CANDLE_PATTERNS,
  suggestedMaPeriods,
  clampMaPeriod,
  INDICATORS,
  indicatorMeta,
  defaultSetupCondition,
  SETUP_TILES,
  TIMEFRAMES,
  timeframeLabel,
  isCoarserOrEqual,
} from "@/lib/strategyDraft";
import TermInfo from "./TermInfo";
import { CandlePatternVisual, CANDLE_PATTERN_META, CrossoverVisual, RsiVisual } from "./StrategyLabVisuals";
import { IndicatorTile } from "./IndicatorTile";
import { explainerKindForSetupTile, explainerKindForExitMode } from "@/lib/strategyLabExplainers";

type PatchSetup = (p: Partial<StrategyDraft["setup"]>) => void;
type PatchTrigger = (p: Partial<StrategyDraft["trigger"]>) => void;
type PatchExit = (p: Partial<StrategyDraft["exit"]>) => void;

const OPERATORS: { value: CompareOperator; label: string }[] = [
  { value: ">", label: "is above" },
  { value: "<", label: "is below" },
  { value: ">=", label: "is at or above" },
  { value: "<=", label: "is at or below" },
  { value: "CROSS_ABOVE", label: "crosses above" },
  { value: "CROSS_BELOW", label: "crosses below" },
];

const SETUP_ICONS: Record<string, LucideIcon> = {
  none: Ban,
  rsi: Gauge,
  trend: TrendingUp,
  EMA: Spline,
  MACD: Waves,
  SMA: LineChart,
  BB: ChevronsUpDown,
  STOCH: Gauge,
  ATR: Vibrate,
  custom: SlidersHorizontal,
};

const EXIT_ICONS: Record<string, LucideIcon> = {
  bracket: ArrowUpDown,
  take_profit: Target,
  stop_loss: ShieldAlert,
  trailing: MoveUpRight,
  time: Clock,
  death_cross: Repeat,
  indicator_cross: Gauge,
  stack: Layers,
};

const selectCls = "rounded-xl border border-border-strong bg-card px-3 py-2.5 text-[15px] text-fg-primary outline-none focus:border-ink";
const numCls = "w-24 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-center font-serif text-lg text-fg-primary outline-none focus:border-ink";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

const Chip = ({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) => (
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

/** A compact, uniform grid tile — icon + label, with an inline explainer. */
const Tile = ({
  selected,
  onClick,
  label,
  Icon,
  term,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  Icon?: LucideIcon;
  term?: string;
}) => (
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
      {Icon && (
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
            selected ? "bg-gold/15 text-gold-deep" : "bg-surface-sunken text-fg-secondary group-hover:text-fg-primary",
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
      )}
      <span className="text-[12.5px] font-medium leading-tight text-fg-primary">{label}</span>
    </button>
    {term && (
      <span className="absolute right-1.5 top-1.5 z-10" onClick={(e) => e.stopPropagation()}>
        <TermInfo termKey={term} />
      </span>
    )}
  </div>
);

const EditorShell = ({ children }: { children: React.ReactNode }) => (
  <div className="animate-slide-in rounded-2xl border border-border-subtle bg-surface-sunken/50 p-6">{children}</div>
);

// ---------------------------------------------------------------------------
// General condition editor (shared by all indicator setup tiles)
// ---------------------------------------------------------------------------

function OperandEditor({
  operand,
  onChange,
  allowPrice,
}: {
  operand: ConditionOperand;
  onChange: (o: ConditionOperand) => void;
  allowPrice?: boolean;
}) {
  const meta = indicatorMeta(operand.indicator);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowPrice ? (
        <select
          value={operand.kind === "price" ? "price" : operand.indicator}
          onChange={(e) =>
            e.target.value === "price"
              ? onChange({ ...operand, kind: "price" })
              : onChange({ ...operand, kind: "indicator", indicator: e.target.value as IndicatorId })
          }
          className={selectCls}
        >
          <option value="price">Price (close)</option>
          {INDICATORS.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
      ) : (
        <select
          value={operand.indicator}
          onChange={(e) => onChange({ ...operand, kind: "indicator", indicator: e.target.value as IndicatorId })}
          className={selectCls}
        >
          {INDICATORS.map((ind) => (
            <option key={ind.id} value={ind.id}>{ind.label}</option>
          ))}
        </select>
      )}
      {operand.kind === "indicator" && meta.hasPeriod && (
        <input
          type="number"
          min={2}
          max={500}
          value={operand.period}
          onChange={(e) => onChange({ ...operand, period: clampMaPeriod(Number(e.target.value)) })}
          className={numCls}
        />
      )}
      {operand.kind === "indicator" && meta.outputs && (
        <select value={operand.output} onChange={(e) => onChange({ ...operand, output: e.target.value })} className={selectCls}>
          {meta.outputs.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

function ConditionBuilder({ draft, patchSetup }: { draft: StrategyDraft; patchSetup: PatchSetup }) {
  const cond = draft.setup.condition ?? defaultSetupCondition();
  const setCond = (next: Partial<typeof cond>) =>
    patchSetup({ mode: "indicator", kind: "indicator", condition: { ...cond, ...next } });
  return (
    <div className="flex flex-col gap-3">
      <span className="font-cap text-xs uppercase tracking-wide text-fg-muted">Enter when</span>
      <OperandEditor operand={cond.left} onChange={(left) => setCond({ left })} allowPrice />
      <select value={cond.operator} onChange={(e) => setCond({ operator: e.target.value as CompareOperator })} className={cn(selectCls, "w-fit")}>
        {OPERATORS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={cond.right.kind === "value" ? "value" : "indicator"}
          onChange={(e) =>
            setCond({ right: e.target.value === "value" ? { ...cond.right, kind: "value" } : { ...cond.right, kind: "indicator" } })
          }
          className={selectCls}
        >
          <option value="value">a number</option>
          <option value="indicator">an indicator</option>
        </select>
        {cond.right.kind === "value" ? (
          <input
            type="number"
            value={cond.right.value}
            onChange={(e) => setCond({ right: { ...cond.right, kind: "value", value: Number(e.target.value) } })}
            className={numCls}
          />
        ) : (
          <OperandEditor operand={cond.right} onChange={(right) => setCond({ right })} />
        )}
      </div>
    </div>
  );
}

function MultiTimeframe({ draft, patchSetup }: { draft: StrategyDraft; patchSetup: PatchSetup }) {
  const base = draft.timeframe;
  const coarser = TIMEFRAMES.filter((tf) => isCoarserOrEqual(tf, base) && tf !== base);
  const on = Boolean(draft.setup.timeframe && draft.setup.timeframe !== base);
  if (draft.setup.mode === "none") return null;
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-border-subtle pt-5">
      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => patchSetup({ timeframe: e.target.checked ? coarser[0] ?? base : undefined })}
          className="h-4 w-4 accent-[hsl(var(--accent-ink))]"
          disabled={coarser.length === 0}
        />
        <span className="flex items-center gap-1.5 font-cap text-sm font-medium text-fg-primary">
          Check this on a higher timeframe <TermInfo termKey="multiTimeframe" />
        </span>
      </label>
      {coarser.length === 0 ? (
        <p className="text-[13px] text-fg-muted">Pick a finer chart timeframe to enable this.</p>
      ) : (
        on && (
          <div className="flex flex-wrap gap-2">
            {coarser.map((tf) => (
              <Chip key={tf} label={timeframeLabel(tf)} selected={draft.setup.timeframe === tf} onClick={() => patchSetup({ timeframe: tf })} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup panel
// ---------------------------------------------------------------------------

export function SetupPanel({
  draft,
  patchSetup,
  activeTile,
  onSelectTile,
}: {
  draft: StrategyDraft;
  patchSetup: PatchSetup;
  activeTile: string;
  onSelectTile: (key: string) => void;
}) {
  const editor = () => {
    if (activeTile === "none") {
      return (
        <EditorShell>
          <p className="text-[15px] leading-relaxed text-fg-secondary">Every day qualifies — your entry signal alone decides when to buy.</p>
        </EditorShell>
      );
    }
    if (activeTile === "rsi") {
      return (
        <EditorShell>
          <p className="font-serif text-xl text-fg-primary">When is momentum strong enough?</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              { label: "Balanced (above 50)", threshold: 50 },
              { label: "Cautious (above 55)", threshold: 55 },
              { label: "Aggressive (above 40)", threshold: 40 },
            ].map((opt) => (
              <Chip
                key={opt.label}
                label={opt.label}
                selected={draft.setup.threshold === opt.threshold && draft.setup.operator === ">"}
                onClick={() => patchSetup({ threshold: opt.threshold, operator: ">", period: 14 })}
              />
            ))}
          </div>
          <div className="mt-7 flex justify-center"><RsiVisual level={draft.setup.threshold} active /></div>
          <MultiTimeframe draft={draft} patchSetup={patchSetup} />
        </EditorShell>
      );
    }
    if (activeTile === "trend") {
      const maSide = (side: "fast" | "slow") => {
        const isFast = side === "fast";
        const typeKey = isFast ? "fastType" : "slowType";
        const periodKey = isFast ? "fastPeriod" : "slowPeriod";
        const maType = draft.setup[typeKey];
        const period = draft.setup[periodKey];
        return (
          <div className="flex flex-col gap-3">
            <span className="font-cap text-xs uppercase tracking-wide text-fg-muted">{isFast ? "Fast" : "Slow"} average</span>
            <div className="flex flex-wrap gap-2">
              {(["EMA", "SMA"] as MaType[]).map((t) => (
                <Chip key={t} label={t} selected={maType === t} onClick={() => patchSetup({ [typeKey]: t })} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input type="number" min={2} max={500} value={period} onChange={(e) => patchSetup({ [periodKey]: clampMaPeriod(Number(e.target.value)) })} className={numCls} />
              <span className="font-cap text-sm text-fg-muted">days</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedMaPeriods(maType).map((p) => (
                <Chip key={p} label={`${p}`} selected={period === p} onClick={() => patchSetup({ [periodKey]: p })} />
              ))}
            </div>
          </div>
        );
      };
      return (
        <EditorShell>
          <p className="font-serif text-xl text-fg-primary">Shape your trend filter</p>
          <p className="mt-1.5 text-[14px] text-fg-secondary">Fast average must stay above the slow — an uptrend regime.</p>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">{maSide("fast")}{maSide("slow")}</div>
          <div className="mt-7 flex justify-center"><CrossoverVisual active /></div>
          <MultiTimeframe draft={draft} patchSetup={patchSetup} />
        </EditorShell>
      );
    }
    return (
      <EditorShell>
        <ConditionBuilder draft={draft} patchSetup={patchSetup} />
        <MultiTimeframe draft={draft} patchSetup={patchSetup} />
      </EditorShell>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Choose a setup condition · hover a tile to see what it means
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:grid-cols-6">
          {SETUP_TILES.map((t) => (
            <IndicatorTile
              key={t.key}
              label={t.label}
              termKey={t.term}
              explainerKind={explainerKindForSetupTile(t.key)}
              Icon={SETUP_ICONS[t.key]}
              selected={activeTile === t.key}
              onClick={() => onSelectTile(t.key)}
            />
          ))}
        </div>
      </div>
      {editor()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Entry panel
// ---------------------------------------------------------------------------

export function EntryPanel({ draft, patchTrigger }: { draft: StrategyDraft; patchTrigger: PatchTrigger }) {
  const mode = draft.trigger.mode;
  const options: Array<{ id: StrategyDraft["trigger"]["mode"]; title: string; Icon: LucideIcon; apply: Partial<StrategyDraft["trigger"]>; term?: string }> = [
    { id: "none", title: "On the setup edge", Icon: Zap, term: "setupEdge", apply: { mode: "none" } },
    { id: "candle_pattern", title: "A candle pattern", Icon: CandlestickChart, term: "candlePattern", apply: { mode: "candle_pattern", pattern: "BULLISH_ENGULFING" } },
    { id: "price_level", title: "Price crosses a level", Icon: Crosshair, term: "priceCrossover", apply: { mode: "price_level", priceLevel: 100, priceDirection: "ABOVE" } },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        {options.map((opt) => (
          <Tile key={opt.id} label={opt.title} term={opt.term} Icon={opt.Icon} selected={mode === opt.id} onClick={() => patchTrigger(opt.apply)} />
        ))}
      </div>

      {mode === "candle_pattern" && (
        <EditorShell>
          <p className="font-serif text-xl text-fg-primary">Which pattern?</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CANDLE_PATTERNS.map((p) => {
              const selected = draft.trigger.pattern === p.value;
              const meta = CANDLE_PATTERN_META[p.value];
              const tone = meta?.bias === "Bullish" ? "text-positive" : meta?.bias === "Bearish" ? "text-negative" : "text-fg-muted";
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => patchTrigger({ pattern: p.value })}
                  aria-pressed={selected}
                  className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-3 text-left transition-all", selected ? "border-2 border-gold" : "border-border-subtle hover:border-border-strong")}
                >
                  <div className="flex h-14 items-end justify-center"><CandlePatternVisual pattern={p.value} active={selected} /></div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-medium text-fg-primary">{p.label}</span>
                    {meta && <span className={cn("font-cap text-[10px] font-semibold", tone)}>{meta.bias}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </EditorShell>
      )}

      {mode === "price_level" && (
        <EditorShell>
          <p className="font-serif text-xl text-fg-primary">Price level break</p>
          <div className="mt-5 flex flex-col gap-5">
            <div className="flex flex-wrap gap-3">
              {(["ABOVE", "BELOW"] as const).map((dir) => (
                <Chip key={dir} label={dir === "ABOVE" ? "Cross above" : "Cross below"} selected={draft.trigger.priceDirection === dir} onClick={() => patchTrigger({ priceDirection: dir })} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-cap text-sm text-fg-muted">$</span>
              <input type="number" min={0} step={0.01} value={draft.trigger.priceLevel} onChange={(e) => patchTrigger({ priceLevel: Number(e.target.value) })} className="w-full max-w-xs rounded-xl border border-border-strong bg-card px-4 py-3 font-serif text-xl text-fg-primary outline-none focus:border-ink" placeholder="e.g. 150" />
            </div>
          </div>
        </EditorShell>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exit panel
// ---------------------------------------------------------------------------

const EXIT_TILES: Array<{ key: StrategyDraft["exit"]["mode"]; label: string; group: "common" | "advanced"; term?: string }> = [
  { key: "bracket", label: "Target + stop", group: "common", term: "takeProfit" },
  { key: "take_profit", label: "Take profit", group: "common", term: "takeProfit" },
  { key: "stop_loss", label: "Stop loss", group: "common", term: "stopLoss" },
  { key: "trailing", label: "Trailing stop", group: "common", term: "trailingStop" },
  { key: "time", label: "Time limit", group: "common", term: "timeExit" },
  { key: "death_cross", label: "Signal flip", group: "advanced", term: "signalFlip" },
  { key: "indicator_cross", label: "Indicator exit", group: "advanced", term: "indicatorExit" },
  { key: "stack", label: "Combine rules", group: "advanced" },
];

const STACK_LEAVES: { kind: ExitLeafKind; label: string; defaultPct?: number; term: string }[] = [
  { kind: "stop_loss", label: "Stop loss", defaultPct: 5, term: "stopLoss" },
  { kind: "take_profit", label: "Take profit", defaultPct: 10, term: "takeProfit" },
  { kind: "trailing", label: "Trailing stop", defaultPct: 5, term: "trailingStop" },
  { kind: "signal_flip", label: "Bearish flip", term: "signalFlip" },
];

export function ExitPanel({ draft, patchExit }: { draft: StrategyDraft; patchExit: PatchExit }) {
  const mode = draft.exit.mode;
  const stack = draft.exit.stack ?? [];
  const stackHas = (k: ExitLeafKind) => stack.some((r) => r.kind === k);
  const toggleStackLeaf = (leaf: { kind: ExitLeafKind; defaultPct?: number }) => {
    const next: ExitRuleSpec[] = stackHas(leaf.kind) ? stack.filter((r) => r.kind !== leaf.kind) : [...stack, { kind: leaf.kind, pct: leaf.defaultPct }];
    patchExit({ mode: "stack", stack: next });
  };
  const setStackPct = (k: ExitLeafKind, pct: number) => patchExit({ mode: "stack", stack: stack.map((r) => (r.kind === k ? { ...r, pct } : r)) });

  const editor = () => {
    if (mode === "bracket" || mode === "take_profit" || mode === "stop_loss") {
      return (
        <EditorShell>
          {(mode === "bracket" || mode === "take_profit") && (
            <div className="mb-8 flex flex-col gap-3">
              <span className="font-serif text-lg text-fg-primary">Take profit at</span>
              <div className="flex flex-wrap gap-3">
                {[5, 10, 15, 20].map((v) => (
                  <Chip key={v} label={`+${v}%`} selected={draft.exit.takeProfitPct === v} onClick={() => patchExit({ takeProfitPct: v })} />
                ))}
              </div>
            </div>
          )}
          {(mode === "bracket" || mode === "stop_loss") && (
            <div className="flex flex-col gap-3">
              <span className="font-serif text-lg text-fg-primary">Stop loss at</span>
              <div className="flex flex-wrap gap-3">
                {[3, 5, 8, 10].map((v) => (
                  <Chip key={v} label={`−${v}%`} selected={draft.exit.stopLossPct === v} onClick={() => patchExit({ stopLossPct: v })} />
                ))}
              </div>
            </div>
          )}
        </EditorShell>
      );
    }
    if (mode === "trailing") {
      return (
        <EditorShell>
          <span className="font-serif text-lg text-fg-primary">Trail by</span>
          <div className="mt-4 flex flex-wrap gap-3">
            {[2, 3, 5, 8].map((v) => (
              <Chip key={v} label={`${v}% from peak`} selected={draft.exit.trailingStopPct === v} onClick={() => patchExit({ trailingStopPct: v })} />
            ))}
          </div>
        </EditorShell>
      );
    }
    if (mode === "time") {
      return (
        <EditorShell>
          <span className="font-serif text-lg text-fg-primary">Hold at most</span>
          <div className="mt-4 flex flex-wrap gap-3">
            {[5, 10, 20, 30].map((v) => (
              <Chip key={v} label={`${v} days`} selected={draft.exit.maxHoldingDays === v} onClick={() => patchExit({ maxHoldingDays: v })} />
            ))}
          </div>
        </EditorShell>
      );
    }
    if (mode === "death_cross") {
      return <EditorShell><p className="text-[15px] leading-relaxed text-fg-secondary">Exit when the fast average crosses back below the slow — the mirror of a trend entry.</p></EditorShell>;
    }
    if (mode === "indicator_cross") {
      return (
        <EditorShell>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] text-fg-secondary">Exit when</span>
            <select value={draft.exit.exitIndicator ?? "RSI"} onChange={(e) => patchExit({ exitIndicator: e.target.value as "RSI" | "STOCH" })} className={selectCls}>
              <option value="RSI">RSI</option>
              <option value="STOCH">Stochastic</option>
            </select>
            <select value={draft.exit.exitDirection ?? "DOWN"} onChange={(e) => patchExit({ exitDirection: e.target.value as "UP" | "DOWN" })} className={selectCls}>
              <option value="DOWN">crosses down through</option>
              <option value="UP">crosses up through</option>
            </select>
            <input type="number" value={draft.exit.exitValue ?? 50} onChange={(e) => patchExit({ exitValue: Number(e.target.value) })} className={numCls} />
          </div>
        </EditorShell>
      );
    }
    return (
      <EditorShell>
        <p className="flex items-center gap-1.5 font-serif text-lg text-fg-primary">
          Combine rules <span className="font-cap text-xs font-normal text-fg-muted">(whichever fires first)</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STACK_LEAVES.map((leaf) => (
            <Chip key={leaf.kind} label={leaf.label} selected={stackHas(leaf.kind)} onClick={() => toggleStackLeaf(leaf)} />
          ))}
        </div>
        {stack.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-card p-5">
            {stack.map((r) => {
              const meta = STACK_LEAVES.find((l) => l.kind === r.kind);
              if (!meta) return null;
              if (meta.defaultPct == null) {
                return <div key={r.kind} className="flex items-center gap-1.5 text-[15px] text-fg-secondary">{meta.label}<TermInfo termKey={meta.term} /></div>;
              }
              return (
                <div key={r.kind} className="flex items-center gap-3">
                  <span className="flex w-32 items-center gap-1.5 text-[15px] text-fg-secondary">{meta.label}<TermInfo termKey={meta.term} /></span>
                  <input type="number" min={0} step={0.5} value={r.pct ?? meta.defaultPct} onChange={(e) => setStackPct(r.kind, Number(e.target.value))} className={numCls} />
                  <span className="font-cap text-sm text-fg-muted">%</span>
                </div>
              );
            })}
          </div>
        )}
      </EditorShell>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
          Choose how a trade closes · hover a tile to see what it means
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:grid-cols-6">
          {EXIT_TILES.map((t) => (
            <IndicatorTile
              key={t.key}
              label={t.label}
              termKey={t.term}
              explainerKind={explainerKindForExitMode(t.key)}
              Icon={EXIT_ICONS[t.key]}
              selected={mode === t.key}
              onClick={() => patchExit({ mode: t.key })}
            />
          ))}
        </div>
      </div>
      {editor()}
    </div>
  );
}
