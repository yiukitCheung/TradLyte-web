import { cn } from "@/lib/utils";

/** Animated mini chart: two MAs crossing (golden cross). */
export function CrossoverVisual({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 120 64" className="h-16 w-28 overflow-visible" aria-hidden>
      <path
        d="M4 52 Q 40 50, 72 36 T 116 24"
        fill="none"
        stroke="hsl(var(--fg-muted))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d="M4 48 Q 30 44, 56 28 T 116 12"
        fill="none"
        stroke="hsl(var(--accent-deep))"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        className={cn(active && "signal-draw")}
      />
      {active && (
        <>
          <circle cx="72" cy="32" r="5" fill="hsl(var(--accent))" opacity={0.4} className="signal-ping" style={{ animationDelay: "1.1s" }} />
          <circle cx="72" cy="32" r="3.5" className="fill-gold" />
        </>
      )}
    </svg>
  );
}

/** RSI gauge arc filling upward. */
export function RsiVisual({ level = 50, active }: { level?: number; active?: boolean }) {
  const pct = Math.min(100, Math.max(0, level));
  return (
    <div className="relative flex h-16 w-16 items-end justify-center" aria-hidden>
      <div className="absolute inset-0 rounded-full border-2 border-border-subtle" />
      <div
        className={cn(
          "absolute bottom-1 left-1 right-1 rounded-full bg-gold/25 transition-all duration-700 ease-out",
          active && "bg-gold/40",
        )}
        style={{ height: `${pct * 0.55}%` }}
      />
      <span className="relative z-10 font-serif text-lg text-gold-deep transition-transform duration-500">{pct}</span>
    </div>
  );
}

/** Price crossing above a smooth average line. */
export function PriceCrossVisual({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 120 64" className="h-16 w-28 overflow-visible" aria-hidden>
      <path d="M4 40 Q 60 38, 116 34" fill="none" stroke="hsl(var(--fg-muted))" strokeWidth="2" opacity={0.5} />
      <path
        d="M4 50 L 28 46 L 52 38 L 76 28 L 100 20 L 116 16"
        fill="none"
        stroke="hsl(var(--accent-deep))"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        className={cn(active && "signal-draw")}
      />
      {active && (
        <>
          <circle cx="62" cy="35" r="5" fill="hsl(var(--accent))" opacity={0.4} className="signal-ping" style={{ animationDelay: "0.8s" }} />
          <circle cx="62" cy="35" r="3.5" className="fill-gold" />
        </>
      )}
    </svg>
  );
}

/** Simple green candle for pattern trigger. */
export function CandleVisual({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 48 64" className="h-16 w-12" aria-hidden>
      <line x1="24" y1="8" x2="24" y2="56" stroke="hsl(var(--fg-muted))" strokeWidth="2" />
      <rect
        x="14"
        y="22"
        width="20"
        height="28"
        rx="2"
        className={cn("fill-positive/80", active && "candle-grow")}
      />
    </svg>
  );
}

/** Bracket exit: profit zone above, stop below. */
export function BracketVisual({ active }: { active?: boolean }) {
  return (
    <div className="flex h-16 w-24 flex-col justify-center gap-2" aria-hidden>
      <div
        className={cn(
          "h-1.5 origin-left rounded-full bg-positive/60 transition-all duration-500 ease-out",
          active ? "w-full bg-positive/80" : "w-3/4",
        )}
      />
      <div className="mx-auto h-8 w-px bg-border-strong" />
      <div
        className={cn(
          "h-1.5 origin-left rounded-full bg-negative/50 transition-all duration-500 ease-out delay-150",
          active ? "w-full bg-negative/70" : "w-3/4",
        )}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Candle-pattern explainers — one distinct, accurate shape per pattern
 * so a learner can SEE what each looks like and how they differ.
 * ------------------------------------------------------------------ */

type CandleTone = "pos" | "neg" | "muted";

const toneFill: Record<CandleTone, string> = {
  pos: "fill-positive/85",
  neg: "fill-negative/80",
  muted: "fill-fg-muted/70",
};
const toneStroke: Record<CandleTone, string> = {
  pos: "stroke-positive/70",
  neg: "stroke-negative/70",
  muted: "stroke-fg-muted/60",
};

/** A single candlestick. Coords are viewBox y-values (smaller y = higher price). */
function Candle({
  x,
  w = 12,
  bodyTop,
  bodyBottom,
  high,
  low,
  tone,
  active,
  delay = 0,
}: {
  x: number;
  w?: number;
  bodyTop: number;
  bodyBottom: number;
  high: number;
  low: number;
  tone: CandleTone;
  active?: boolean;
  delay?: number;
}) {
  const cx = x + w / 2;
  return (
    <g
      className={cn(active && "candle-grow")}
      style={active ? { animationDelay: `${delay}ms`, transformBox: "fill-box", transformOrigin: "bottom" } : undefined}
    >
      <line x1={cx} y1={high} x2={cx} y2={low} strokeWidth={1.5} className={toneStroke[tone]} strokeLinecap="round" />
      <rect x={x} y={bodyTop} width={w} height={Math.max(2.5, bodyBottom - bodyTop)} rx={1.5} className={toneFill[tone]} />
    </g>
  );
}

export interface CandlePatternMeta {
  bias: "Bullish" | "Bearish" | "Neutral";
  meaning: string;
}

/** UI-only metadata (bias + plain-language meaning) keyed by pattern value. */
export const CANDLE_PATTERN_META: Record<string, CandlePatternMeta> = {
  GREEN_CANDLE: { bias: "Bullish", meaning: "Closed higher than it opened — buyers won the day." },
  RED_CANDLE: { bias: "Bearish", meaning: "Closed lower than it opened — sellers were in control." },
  BULLISH_ENGULFING: { bias: "Bullish", meaning: "A big up day swallows the prior down day — momentum flips up." },
  BEARISH_ENGULFING: { bias: "Bearish", meaning: "A big down day swallows the prior up day — momentum flips down." },
  HAMMER: { bias: "Bullish", meaning: "Long lower wick — price was pushed down but buyers reclaimed it." },
  SHOOTING_STAR: { bias: "Bearish", meaning: "Long upper wick — a rally rejected; sellers stepped in." },
  DOJI: { bias: "Neutral", meaning: "Open ≈ close — indecision, a possible turning point." },
  MORNING_STAR: { bias: "Bullish", meaning: "Down, pause, then up over three days — a bottom forming." },
  EVENING_STAR: { bias: "Bearish", meaning: "Up, pause, then down over three days — a top forming." },
};

/** Distinct mini-illustration for each supported candle pattern. */
export function CandlePatternVisual({ pattern, active }: { pattern: string; active?: boolean }) {
  const cls = "h-16 w-full max-w-[88px]";
  switch (pattern) {
    case "RED_CANDLE":
      return (
        <svg viewBox="0 0 40 64" className={cls} aria-hidden>
          <Candle x={14} bodyTop={20} bodyBottom={44} high={10} low={54} tone="neg" active={active} />
        </svg>
      );
    case "BULLISH_ENGULFING":
      return (
        <svg viewBox="0 0 64 64" className={cls} aria-hidden>
          <Candle x={12} w={11} bodyTop={26} bodyBottom={38} high={20} low={44} tone="neg" active={active} />
          <Candle x={34} w={14} bodyTop={16} bodyBottom={48} high={10} low={54} tone="pos" active={active} delay={140} />
        </svg>
      );
    case "BEARISH_ENGULFING":
      return (
        <svg viewBox="0 0 64 64" className={cls} aria-hidden>
          <Candle x={12} w={11} bodyTop={26} bodyBottom={38} high={20} low={44} tone="pos" active={active} />
          <Candle x={34} w={14} bodyTop={16} bodyBottom={48} high={10} low={54} tone="neg" active={active} delay={140} />
        </svg>
      );
    case "HAMMER":
      return (
        <svg viewBox="0 0 40 64" className={cls} aria-hidden>
          <Candle x={14} bodyTop={14} bodyBottom={24} high={10} low={56} tone="pos" active={active} />
        </svg>
      );
    case "SHOOTING_STAR":
      return (
        <svg viewBox="0 0 40 64" className={cls} aria-hidden>
          <Candle x={14} bodyTop={40} bodyBottom={50} high={8} low={54} tone="neg" active={active} />
        </svg>
      );
    case "DOJI":
      return (
        <svg viewBox="0 0 40 64" className={cls} aria-hidden>
          <Candle x={14} bodyTop={30} bodyBottom={34} high={10} low={54} tone="muted" active={active} />
        </svg>
      );
    case "MORNING_STAR":
      return (
        <svg viewBox="0 0 80 64" className={cls} aria-hidden>
          <Candle x={8} w={12} bodyTop={14} bodyBottom={40} high={10} low={44} tone="neg" active={active} />
          <Candle x={32} w={10} bodyTop={46} bodyBottom={52} high={42} low={56} tone="muted" active={active} delay={120} />
          <Candle x={56} w={12} bodyTop={18} bodyBottom={44} high={12} low={48} tone="pos" active={active} delay={240} />
        </svg>
      );
    case "EVENING_STAR":
      return (
        <svg viewBox="0 0 80 64" className={cls} aria-hidden>
          <Candle x={8} w={12} bodyTop={20} bodyBottom={46} high={16} low={50} tone="pos" active={active} />
          <Candle x={32} w={10} bodyTop={10} bodyBottom={16} high={6} low={20} tone="muted" active={active} delay={120} />
          <Candle x={56} w={12} bodyTop={18} bodyBottom={44} high={14} low={48} tone="neg" active={active} delay={240} />
        </svg>
      );
    case "GREEN_CANDLE":
    default:
      return (
        <svg viewBox="0 0 40 64" className={cls} aria-hidden>
          <Candle x={14} bodyTop={20} bodyBottom={44} high={10} low={54} tone="pos" active={active} />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ *
 * Exit / stop-loss explainers — each draws the same price path but
 * annotates a different exit rule, so the contrast is visible.
 * ------------------------------------------------------------------ */

const ENTRY_Y = 38;

function EntryDot() {
  return <circle cx="6" cy={ENTRY_Y} r="3" className="fill-ink" />;
}

/** Distinct annotated price path per exit mode. */
export function ExitVisual({ kind, active }: { kind: string; active?: boolean }) {
  const cls = "h-16 w-28 overflow-visible";
  const priceCommon = {
    fill: "none" as const,
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    stroke: "hsl(var(--accent-deep))",
    pathLength: 1,
  };

  switch (kind) {
    case "take_profit":
      return (
        <svg viewBox="0 0 120 64" className={cls} aria-hidden>
          <line x1="0" y1="16" x2="120" y2="16" className="stroke-positive/70" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M6 38 Q 50 34, 80 24 T 112 16" {...priceCommon} className={cn(active && "signal-draw")} />
          <EntryDot />
          {active && <circle cx="112" cy="16" r="4" className="fill-positive" />}
        </svg>
      );
    case "stop_loss":
      return (
        <svg viewBox="0 0 120 64" className={cls} aria-hidden>
          <line x1="0" y1="52" x2="120" y2="52" className="stroke-negative/70" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M6 38 Q 40 36, 70 42 T 112 52" {...priceCommon} className={cn(active && "signal-draw")} />
          <EntryDot />
          {active && <circle cx="112" cy="52" r="4" className="fill-negative" />}
        </svg>
      );
    case "trailing":
      return (
        <svg viewBox="0 0 120 64" className={cls} aria-hidden>
          {/* stepped stop that ratchets up under the rise, then catches the fall */}
          <path d="M6 50 L 40 50 L 40 38 L 72 38 L 72 26 L 100 26" fill="none" className="stroke-negative/55" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M6 38 Q 44 22, 72 16 Q 92 13, 100 26" {...priceCommon} className={cn(active && "signal-draw")} />
          <EntryDot />
          {active && <circle cx="100" cy="26" r="4" className="fill-negative" />}
        </svg>
      );
    case "time":
      return (
        <svg viewBox="0 0 120 64" className={cls} aria-hidden>
          <line x1="92" y1="6" x2="92" y2="58" className="stroke-fg-muted/60" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M6 38 Q 40 30, 70 34 T 112 30" {...priceCommon} className={cn(active && "signal-draw")} />
          <EntryDot />
          {active && <circle cx="92" cy="33" r="4" className="fill-gold" />}
        </svg>
      );
    case "death_cross":
      return (
        <svg viewBox="0 0 120 64" className={cls} aria-hidden>
          <path d="M4 18 Q 40 22, 72 36 T 116 48" fill="none" stroke="hsl(var(--fg-muted))" strokeWidth="2" opacity={0.5} />
          <path d="M4 30 Q 40 32, 72 36 T 116 30" {...priceCommon} className={cn(active && "signal-draw")} />
          {active && (
            <>
              <circle cx="72" cy="36" r="5" fill="hsl(var(--accent))" opacity={0.4} className="signal-ping" style={{ animationDelay: "0.9s" }} />
              <circle cx="72" cy="36" r="3.5" className="fill-negative" />
            </>
          )}
        </svg>
      );
    case "bracket":
    default:
      return (
        <svg viewBox="0 0 120 64" className={cls} aria-hidden>
          <line x1="0" y1="16" x2="120" y2="16" className="stroke-positive/70" strokeWidth="1.5" strokeDasharray="3 3" />
          <line x1="0" y1="52" x2="120" y2="52" className="stroke-negative/70" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M6 38 Q 50 34, 80 24 T 112 16" {...priceCommon} className={cn(active && "signal-draw")} />
          <EntryDot />
          {active && <circle cx="112" cy="16" r="4" className="fill-positive" />}
        </svg>
      );
  }
}

/** Open horizon — no filter. */
export function OpenMarketVisual({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 120 48" className="h-14 w-28" aria-hidden>
      <path
        d="M4 36 Q 40 20, 80 24 T 116 18"
        fill="none"
        stroke="hsl(var(--accent-deep))"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={1}
        opacity={active ? 1 : 0.35}
        className={cn("transition-opacity duration-500", active && "signal-draw")}
      />
    </svg>
  );
}

// --- Combined "price + indicator + buy" scenes (hybrid headline set) ---

function BuyRing({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="11" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" />
      <text x={cx} y={cy + 22} textAnchor="middle" className="fill-positive" fontSize="9" fontWeight={500}>buy</text>
    </>
  );
}

/** Candles + an RSI sub-line crossing up through the threshold; entry candle ringed. */
export function RsiEntryScene({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 150 96" className="h-24 w-full max-w-[160px] overflow-visible" aria-hidden>
      <g>
        <line x1="18" y1="12" x2="18" y2="44" className="stroke-negative/70" strokeWidth="1.5" />
        <rect x="13" y="20" width="10" height="16" rx="1.5" className="fill-negative/80" />
        <line x1="42" y1="16" x2="42" y2="46" className="stroke-negative/70" strokeWidth="1.5" />
        <rect x="37" y="24" width="10" height="14" rx="1.5" className="fill-negative/80" />
        <line x1="66" y1="10" x2="66" y2="40" className="stroke-positive/70" strokeWidth="1.5" />
        <rect x="61" y="16" width="10" height="16" rx="1.5" className={cn("fill-positive/80", active && "candle-grow")} />
        <line x1="96" y1="4" x2="96" y2="34" className="stroke-positive/70" strokeWidth="1.5" />
        <rect x="91" y="9" width="10" height="18" rx="1.5" className={cn("fill-positive/80", active && "candle-grow")} />
        <BuyRing cx={96} cy={18} />
      </g>
      <line x1="6" y1="74" x2="144" y2="74" className="stroke-fg-muted/60" strokeWidth="1" strokeDasharray="3 3" />
      <text x="8" y="70" className="fill-fg-muted" fontSize="8">RSI 50</text>
      <path d="M6 86 Q 40 84, 66 80 T 120 62" fill="none" stroke="hsl(var(--accent-deep))" strokeWidth="2"
            strokeLinecap="round" pathLength={1} className={cn(active && "signal-draw")} />
    </svg>
  );
}

/** Candles + fast/slow averages crossing; entry candle ringed at the cross. */
export function MaCrossScene({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 150 96" className="h-24 w-full max-w-[160px] overflow-visible" aria-hidden>
      <line x1="18" y1="30" x2="18" y2="58" className="stroke-fg-muted/60" strokeWidth="1.5" />
      <rect x="13" y="38" width="10" height="14" rx="1.5" className="fill-fg-muted/50" />
      <line x1="48" y1="26" x2="48" y2="54" className="stroke-fg-muted/60" strokeWidth="1.5" />
      <rect x="43" y="32" width="10" height="14" rx="1.5" className="fill-fg-muted/50" />
      <line x1="90" y1="14" x2="90" y2="42" className="stroke-positive/70" strokeWidth="1.5" />
      <rect x="85" y="20" width="10" height="16" rx="1.5" className={cn("fill-positive/80", active && "candle-grow")} />
      <path d="M6 66 Q 50 60, 90 34 T 144 16" fill="none" stroke="hsl(var(--accent-deep))" strokeWidth="2.5"
            strokeLinecap="round" pathLength={1} className={cn(active && "signal-draw")} />
      <path d="M6 54 Q 60 52, 100 44 T 144 34" fill="none" stroke="hsl(var(--fg-muted))" strokeWidth="2" opacity={0.55} />
      <BuyRing cx={90} cy={28} />
    </svg>
  );
}

/** Candles + a MACD histogram flipping positive; entry candle ringed at the flip. */
export function MacdScene({ active }: { active?: boolean }) {
  const bars = [
    { x: 12, h: -10 }, { x: 30, h: -6 }, { x: 48, h: -2 },
    { x: 66, h: 4 }, { x: 84, h: 9 }, { x: 102, h: 12 },
  ];
  return (
    <svg viewBox="0 0 150 96" className="h-24 w-full max-w-[160px] overflow-visible" aria-hidden>
      <line x1="78" y1="10" x2="78" y2="42" className="stroke-positive/70" strokeWidth="1.5" />
      <rect x="73" y="16" width="10" height="18" rx="1.5" className={cn("fill-positive/80", active && "candle-grow")} />
      <BuyRing cx={78} cy={22} />
      <line x1="6" y1="72" x2="144" y2="72" className="stroke-fg-muted/60" strokeWidth="1" />
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={b.h >= 0 ? 72 - b.h : 72} width="10" height={Math.abs(b.h)} rx="1"
              className={b.h >= 0 ? "fill-positive/70" : "fill-negative/60"} />
      ))}
    </svg>
  );
}

/** Resolves an ExplainerKind to the right illustration (bespoke or reused). */
export function IndicatorScene({ kind, active, pattern }: { kind: string; active?: boolean; pattern?: string }) {
  switch (kind) {
    case "rsi-entry": return <RsiEntryScene active={active} />;
    case "ma-cross": return <MaCrossScene active={active} />;
    case "macd": return <MacdScene active={active} />;
    case "candle": return <CandlePatternVisual pattern={pattern ?? "BULLISH_ENGULFING"} active={active} />;
    case "price-cross": return <PriceCrossVisual active={active} />;
    case "bollinger": return <CrossoverVisual active={active} />;
    case "stochastic": return <RsiVisual level={50} active={active} />;
    case "atr": return <CrossoverVisual active={active} />;
    case "bracket": return <ExitVisual kind="bracket" active={active} />;
    case "take-profit": return <ExitVisual kind="take_profit" active={active} />;
    case "stop-loss": return <ExitVisual kind="stop_loss" active={active} />;
    case "trailing": return <ExitVisual kind="trailing" active={active} />;
    case "time": return <ExitVisual kind="time" active={active} />;
    case "signal-flip": return <ExitVisual kind="death_cross" active={active} />;
    case "indicator-exit": return <RsiVisual level={50} active={active} />;
    default: return null;
  }
}
