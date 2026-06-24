import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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
      <div className={CARD}>
        <Eyebrow regime="current conditions" />
        <p className="font-cap text-sm text-fg-muted">Sign in to see the strategy read for {symbol}.</p>
      </div>
    );
  }

  if (loading) return <LoadingState symbol={symbol} />;

  const rec = data?.recommendation;
  if (!data || data.status !== "confirmed" || !rec) {
    return (
      <div className={CARD}>
        <Eyebrow regime="current conditions" />
        <p className="font-cap text-sm text-fg-muted">
          No confirmed strategy for {symbol} yet — it sits outside the liquid set we test each week.
        </p>
      </div>
    );
  }

  const paragraphs = (data.narrative ?? "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className={CARD}>
      <Eyebrow regime={regimeLabel(rec.regime_bucket)} />

      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-2xl font-medium leading-tight text-fg-primary">
          {strategyHeadline(rec.skeleton_id)}
        </h3>
        <p className="font-cap text-xs text-fg-muted">{strategyDetail(rec)}</p>
      </div>

      {paragraphs.length > 0 ? (
        <div className="flex max-w-[680px] flex-col gap-3 text-[15px] leading-relaxed text-fg-secondary">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : (
        <p className="max-w-[680px] text-[15px] leading-relaxed text-fg-secondary">
          {strategyApproach(rec.skeleton_id)} was the best-fitting approach for {symbol} in conditions like
          now. The test numbers are below — weigh the drawdown before you act.
        </p>
      )}

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
    </div>
  );
}

function Eyebrow({ regime }: { regime: string }) {
  return (
    <p className={EYEBROW}>
      Best fit now <span className="mx-1.5 text-border-strong">·</span> {regime}
      <span className="mx-1.5 text-border-strong">·</span> refreshed weekly
    </p>
  );
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

function LoadingState({ symbol }: { symbol: string }) {
  return (
    <div className={CARD}>
      <Eyebrow regime="reading conditions" />
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 animate-pulse rounded bg-surface-sunken" />
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
      <span className="sr-only">Loading the strategy read for {symbol}</span>
    </div>
  );
}
