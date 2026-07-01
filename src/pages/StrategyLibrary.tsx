import { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { ArrowRight, Copy, Trash2, Play, FlaskConical, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listStrategies,
  duplicateStrategy,
  deleteStrategy,
  type SavedStrategy,
} from "@/lib/savedStrategies";
import { formatReturnPct, formatWinRate } from "@/lib/backtestUtils";
import { isLegacyProConfig, proConfigToDraft } from "@/lib/strategyDraft";

const StrategyLibrary = () => {
  const { user, loading: authLoading } = useRequireOnboarding();
  const navigate = useNavigate();
  const [strategies, setStrategies] = useState<SavedStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setStrategies(await listStrategies(user.id));
    } catch (e) {
      console.error("Failed to load strategies:", e);
      toast.error("Could not load your saved strategies.");
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const openInLab = (s: SavedStrategy) => {
    // Legacy Pro configs migrate into the unified Lab (crossovers → setup-edge entry).
    const draft = isLegacyProConfig(s.draft) ? proConfigToDraft(s.draft) : s.draft;
    navigate("/strategy-builder", { state: { draft, symbol: s.symbol ?? undefined } });
  };

  const handleDuplicate = async (s: SavedStrategy) => {
    if (!user) return;
    try {
      await duplicateStrategy(user.id, s);
      toast.success("Strategy duplicated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not duplicate");
    }
  };

  const handleDelete = async (s: SavedStrategy) => {
    try {
      await deleteStrategy(s.id);
      setStrategies((list) => list.filter((x) => x.id !== s.id)); // optimistic
      toast.success(`Deleted “${s.name}”`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
      load();
    }
  };

  if (authLoading || (loading && strategies.length === 0)) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 md:px-12">
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-9 w-3/4 max-w-[440px]" />
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4 rounded-2xl border border-border-subtle bg-card p-6">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 md:px-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Strategy library</p>
            <h1 className="mt-3 font-serif text-[38px] font-medium leading-tight text-fg-primary">Your saved strategies</h1>
            <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-fg-secondary">
              Every strategy you've saved from the Lab — reopen one to tweak it, duplicate it to branch an idea, or replay it on a new stock.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/strategy-lab/batch"
              className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-5 py-3 text-sm font-semibold text-fg-primary hover:border-border-strong"
            >
              <Layers className="h-4 w-4" /> Batch backtest
            </Link>
            <Link
              to="/strategy-builder"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
            >
              <FlaskConical className="h-4 w-4" /> Open Strategy Lab
            </Link>
          </div>
        </div>

        {strategies.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border-strong bg-card px-8 py-16 text-center">
            <p className="font-serif text-2xl text-fg-primary">No saved strategies yet</p>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fg-secondary">
              Build a strategy in the Lab, run a backtest, then tap “Save to library” to keep it here.
            </p>
            <Link
              to="/strategy-builder"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
            >
              Build your first strategy <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {strategies.map((s) => {
              const ret = s.result?.total_return_pct;
              const isPro = isLegacyProConfig(s.draft);
              return (
                <div key={s.id} className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-card p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl font-medium leading-snug text-fg-primary">{s.name}</h3>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {isPro && (
                        <span className="rounded-md bg-gold/10 px-2 py-1 font-cap text-[11px] font-semibold text-gold-deep">
                          Pro config
                        </span>
                      )}
                      {s.symbol && (
                        <span className="rounded-md bg-surface-sunken px-2 py-1 font-cap text-[11px] font-semibold text-gold-deep">
                          {s.symbol}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.description && <p className="text-sm leading-relaxed text-fg-secondary">{s.description}</p>}
                  {s.result && (
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border-subtle pt-3 font-cap text-[13px]">
                      <span className={cn("font-semibold", (ret ?? 0) >= 0 ? "text-positive" : "text-negative")}>
                        {formatReturnPct(ret)}
                      </span>
                      <span className="text-fg-muted">Win {formatWinRate(s.result.win_rate)}</span>
                      <span className="text-fg-muted">{s.result.total_trades ?? 0} trades</span>
                    </div>
                  )}
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openInLab(s)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-sm font-semibold text-white"
                    >
                      <Play className="h-3.5 w-3.5" /> Open in Lab
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(s)}
                      aria-label={`Duplicate ${s.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-fg-secondary transition-colors hover:border-border-strong hover:text-fg-primary"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      aria-label={`Delete ${s.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-negative transition-colors hover:border-negative/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StrategyLibrary;
