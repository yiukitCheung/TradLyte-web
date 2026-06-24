import { useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  fetchStrategyRead,
  strategyHeadline,
  strategyApproach,
  strategyDetail,
  regimeLabel,
  pctSigned,
  pct,
  drawdownLabel,
  type StrategyRead as StrategyReadData,
} from "@/lib/strategyRead";

type Props = { symbol: string; signedIn: boolean };

const CARD = "flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-7";
const EYEBROW = "font-cap text-[11px] uppercase tracking-[0.18em] text-fg-muted";

const HOW_IT_WORKS =
  "Each week we test thousands of strategy variations against this stock's recent price action, " +
  "then surface the single best-fitting one for the current market — summarized here with its real backtested results.";

/**
 * "Best fit for current conditions" read on the stock detail page. Self-fetches
 * via the strategy-read Edge Function. Numbers are real backtests; the prose is
 * the product's candid take. Nothing here announces how the prose is made.
 */
export default function StrategyRead({ symbol, signedIn }: Props) {
  const [data, setData] = useState<StrategyReadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetchStrategyRead(symbol)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol, signedIn]);

  if (!signedIn) {
    return (
      <Frame eyebrow="signed out">
        <p className="font-cap text-sm text-fg-muted">Sign in to see the strategy read for {symbol}.</p>
      </Frame>
    );
  }

  if (loading) return <LoadingState />;

  const rec = data?.recommendation;
  if (!data || data.status !== "confirmed" || !rec) {
    return (
      <Frame eyebrow="no read yet">
        <p className="font-cap text-sm text-fg-muted">
          No confirmed strategy for {symbol} yet — it sits outside the liquid set we test each week.
        </p>
      </Frame>
    );
  }

  const regime = regimeLabel(rec.regime_bucket).replace(/^an? /, "");

  return (
    <Frame eyebrow={`${regime} · refreshed weekly`}>
      <p className="-mt-1 font-cap text-xs text-fg-muted">
        <span className="text-fg-secondary">{strategyHeadline(rec.skeleton_id)}</span> · {strategyDetail(rec)}
      </p>

      <Narrative
        text={data.narrative}
        fallback={
          <>
            {strategyApproach(rec.skeleton_id)} was the best-fitting approach for {symbol} in conditions like
            now. The numbers below are its real backtest — weigh the drawdown before you act.
          </>
        }
      />

      {/* Signature: the drawdown, set apart as the risk to brace for. */}
      <div className="flex items-center gap-3 pt-1">
        <span className={EYEBROW}>Brace for</span>
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="font-serif text-lg font-semibold tabular-nums text-negative">
          {drawdownLabel(rec.real_max_drawdown_pct)}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 border-t border-border-subtle pt-4">
        <Stat label="Return" value={pctSigned(rec.real_return_pct)} accent={rec.real_return_pct >= 0} />
        <Stat label="Win rate" value={pct(rec.real_win_rate)} />
        <Stat label="Trades" value={String(rec.real_trade_count)} />
        <Stat label="Tested over" value={`${rec.confirmation_window_days}d`} />
      </div>
    </Frame>
  );
}

/** Card shell with the section title, the how-it-works hint, and an eyebrow. */
function Frame({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className={CARD}>
      <div className="flex flex-col gap-1.5">
        <p className={EYEBROW}>{eyebrow}</p>
        <div className="flex items-center gap-1.5">
          <h3 className="font-serif text-2xl font-medium leading-tight text-fg-primary">
            Best fit for current conditions
          </h3>
          <HowHint />
        </div>
      </div>
      {children}
    </div>
  );
}

function HowHint() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="How this is generated"
            className="text-fg-muted transition-colors hover:text-fg-secondary"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs font-cap text-xs leading-relaxed">{HOW_IT_WORKS}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Render the narrative, turning **lead-ins** into real emphasis and splitting paragraphs. */
function Narrative({ text, fallback }: { text: string | null; fallback: ReactNode }) {
  const paragraphs = (text ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return <p className="max-w-[680px] text-[15px] leading-relaxed text-fg-secondary">{fallback}</p>;
  }

  return (
    <div className="flex max-w-[680px] flex-col gap-3 text-[15px] leading-relaxed text-fg-secondary">
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </div>
  );
}

/** Inline markdown: **bold** -> emphasized; everything else is plain text. */
function renderInline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    return bold ? (
      <strong key={i} className="font-semibold text-fg-primary">
        {bold[1]}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    );
  });
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-cap text-[11px] uppercase tracking-wide text-fg-muted">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums", accent ? "text-positive" : "text-fg-primary")}>
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <Frame eyebrow="reading conditions">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-56 animate-pulse rounded bg-surface-sunken" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-full animate-pulse rounded bg-surface-sunken" />
        <div className="h-4 w-[92%] animate-pulse rounded bg-surface-sunken" />
        <div className="h-4 w-[78%] animate-pulse rounded bg-surface-sunken" />
      </div>
      <div className="h-px w-full bg-border-subtle" />
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-surface-sunken" />
        ))}
      </div>
    </Frame>
  );
}
