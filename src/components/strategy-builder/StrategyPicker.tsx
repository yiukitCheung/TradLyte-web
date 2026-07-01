// src/components/strategy-builder/StrategyPicker.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bookmark, Settings2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BACKTEST_RECIPES } from "@/lib/backtestRecipes";
import { listStrategies, type SavedStrategy } from "@/lib/savedStrategies";
import { isLegacyProConfig, proConfigToDraft, type StrategyDraft } from "@/lib/strategyDraft";
import { formatReturnPct } from "@/lib/backtestUtils";

export default function StrategyPicker({
  onPickTemplate, onPickSaved, onClose,
}: {
  onPickTemplate: (recipeId: string) => void;
  onPickSaved: (draft: StrategyDraft, symbol?: string) => void;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedStrategy[]>([]);
  useEffect(() => { if (user) listStrategies(user.id).then(setSaved).catch(() => setSaved([])); }, [user]);

  const pickSaved = (s: SavedStrategy) => {
    const draft = isLegacyProConfig(s.draft) ? proConfigToDraft(s.draft) : s.draft as StrategyDraft;
    onPickSaved(draft, s.symbol ?? undefined);
    onClose();
  };

  return (
    <section className="animate-slide-in rounded-2xl border border-border-subtle bg-surface-sunken/40 p-6">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Templates</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BACKTEST_RECIPES.map((r) => (
              <button key={r.id} type="button" onClick={() => { onPickTemplate(r.id); onClose(); }}
                className="group flex flex-col gap-2.5 rounded-2xl border border-border-subtle bg-card p-5 text-left transition-all hover:border-gold/40">
                <Activity className="h-5 w-5 text-gold-deep" />
                <h3 className="font-serif text-lg font-medium text-fg-primary">{r.title}</h3>
                <p className="text-[13px] leading-relaxed text-fg-secondary">{r.description}</p>
                <span className="mt-1 inline-flex items-center gap-1.5 font-cap text-sm font-medium text-ink opacity-0 transition-opacity group-hover:opacity-100">
                  Load + run <ArrowRight className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Your saved strategies</p>
          {saved.length === 0 ? (
            <p className="text-[14px] text-fg-secondary">
              Nothing saved yet. Run a strategy, then tap "Save to library" to keep it here.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((s) => (
                <div key={s.id} className="flex flex-col gap-2.5 rounded-2xl border border-border-subtle bg-card p-5">
                  <Bookmark className="h-5 w-5 text-gold-deep" />
                  <h3 className="font-serif text-lg font-medium text-fg-primary">{s.name}</h3>
                  {s.result && <p className="font-cap text-[13px] font-semibold text-positive">{formatReturnPct(s.result.total_return_pct)}</p>}
                  <div className="mt-1 flex items-center justify-between">
                    <button type="button" onClick={() => pickSaved(s)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
                      Load <ArrowRight className="h-4 w-4" />
                    </button>
                    <Link to="/strategy-library" className="inline-flex items-center gap-1 font-cap text-[12px] text-fg-muted hover:text-fg-primary">
                      <Settings2 className="h-3.5 w-3.5" /> Manage
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
