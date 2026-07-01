// src/pages/StrategyLab.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GraduationCap, Sparkles, Layers, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { LessonDrawerProvider } from "@/components/strategy-builder/LessonDrawer";
import SingleTestPanel, { type SingleTestHandle } from "@/components/strategy-builder/SingleTestPanel";
import BatchTestPanel from "@/components/strategy-builder/BatchTestPanel";
import StrategyPicker from "@/components/strategy-builder/StrategyPicker";
import type { StrategyDraft } from "@/lib/strategyDraft";

type LabTab = "single" | "batch";

type LocationState = {
  tab?: LabTab;
  batchRunId?: string;
  draft?: StrategyDraft;
  symbol?: string;
} | null;

export default function StrategyLab() {
  const { user, loading } = useRequireOnboarding();
  const location = useLocation();
  const navigate = useNavigate();

  // Capture location.state ONCE in useState initializer so re-renders don't re-read it
  const [initial] = useState<NonNullable<LocationState>>(() => {
    const s = location.state as LocationState;
    return {
      tab: s?.tab,
      batchRunId: s?.batchRunId,
      draft: s?.draft,
      symbol: s?.symbol,
    };
  });

  const [tab, setTab] = useState<LabTab>(initial.tab ?? "single");
  const [pickerOpen, setPickerOpen] = useState(false);
  const singleRef = useRef<SingleTestHandle>(null);

  // Clear location.state on mount so soft re-navs don't re-seed the panels
  useEffect(() => {
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <LessonDrawerProvider>
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 pb-24 pt-16 md:px-12 md:pt-24">
          <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">Strategy lab</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h1 className="max-w-[680px] font-serif text-[38px] font-medium leading-[1.08] text-fg-primary md:text-[48px]">
              Compose a strategy, replay it on real history.
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTab("single");
                  setPickerOpen((o) => !o);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-4 py-2 font-cap text-sm font-medium text-fg-primary hover:border-ink"
              >
                <Sparkles className="h-4 w-4 text-gold-deep" /> Templates &amp; saved
              </button>
              <a
                href="/learn"
                className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-4 py-2 font-cap text-sm font-medium text-fg-primary hover:border-ink"
              >
                <GraduationCap className="h-4 w-4 text-gold-deep" /> 2-min primer
              </a>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex w-fit items-center gap-1 rounded-full border border-border-subtle bg-card p-1">
            {(
              [
                ["single", "Single test", FlaskConical],
                ["batch", "Batch test", Layers],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-cap text-sm font-semibold transition-colors",
                  tab === id ? "bg-ink text-white" : "text-fg-secondary hover:text-fg-primary",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {/* Panels — both mounted; toggle with hidden to preserve in-progress state */}
          <div className="mt-8">
            <div className={tab === "single" ? "" : "hidden"}>
              <SingleTestPanel
                ref={singleRef}
                initialDraft={initial.draft}
                initialSymbol={initial.symbol}
                pickerSlot={pickerOpen ? (
                  <StrategyPicker
                    onPickTemplate={(id) => singleRef.current?.applyRecipe(id)}
                    onPickSaved={(draft, symbol) => singleRef.current?.loadDraft(draft, { symbol })}
                    onClose={() => setPickerOpen(false)}
                  />
                ) : null}
              />
            </div>
            <div className={tab === "batch" ? "" : "hidden"}>
              <BatchTestPanel initialBatchRunId={initial.batchRunId} />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </LessonDrawerProvider>
  );
}
