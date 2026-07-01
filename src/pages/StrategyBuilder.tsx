import { useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Library, GraduationCap, Layers } from "lucide-react";
import { LessonDrawerProvider } from "@/components/strategy-builder/LessonDrawer";
import SingleTestPanel, { type SingleTestHandle } from "@/components/strategy-builder/SingleTestPanel";
import type { StrategyDraft } from "@/lib/strategyDraft";

const StrategyBuilder = () => {
  const { user, loading } = useRequireOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef<SingleTestHandle>(null);

  // Read incoming draft from location.state, pass to panel, then clear state.
  const incoming = location.state as { draft?: StrategyDraft; symbol?: string } | null;
  const initialDraft = incoming?.draft;
  const initialSymbol = incoming?.symbol;

  useEffect(() => {
    if (incoming?.draft) {
      navigate("/strategy-builder", { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">Loading…</div>;
  }
  if (!user) return null;

  return (
    <LessonDrawerProvider>
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="mx-auto w-full max-w-[1200px] flex-1">
          {/* Hero */}
          <section className="px-6 pb-8 pt-16 md:px-12 md:pt-24">
            <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">Strategy lab</p>
            <h1 className="mt-4 max-w-[680px] font-serif text-[38px] font-medium leading-[1.08] text-fg-primary md:text-[48px]">
              Compose a strategy, replay it on real history.
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to="/strategy-lab/batch" className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-5 py-2.5 font-cap text-sm font-medium text-fg-primary transition-colors hover:border-ink">
                <Layers className="h-4 w-4 text-gold-deep" /> Batch test
              </Link>
              <Link to="/strategy-library" className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-5 py-2.5 font-cap text-sm font-medium text-fg-primary transition-colors hover:border-ink">
                <Library className="h-4 w-4 text-gold-deep" /> Saved strategies
              </Link>
              <Link to="/learn" className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-card px-5 py-2.5 font-cap text-sm font-medium text-fg-primary transition-colors hover:border-ink">
                <GraduationCap className="h-4 w-4 text-gold-deep" /> 2-min primer
              </Link>
            </div>
          </section>

          <SingleTestPanel
            ref={panelRef}
            initialDraft={initialDraft}
            initialSymbol={initialSymbol}
          />
        </main>
        <Footer />
      </div>
    </LessonDrawerProvider>
  );
};

export default StrategyBuilder;
