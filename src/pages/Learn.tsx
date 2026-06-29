/**
 * Indicator Lab — interactive "drag-to-understand" lessons (web route /learn).
 *
 * Full-page host for the shared <LearnFlow> sequence: (0) CandleAnatomy primer, then
 * (1–4) IndicatorPlayground lessons (EMA → RSI → MACD → Bollinger). The flow itself —
 * ordering, progress, and the StrategyDraft handoff to the Strategy Lab — lives in
 * src/components/education/LearnFlow.tsx so the Profile "Learning" tab can embed it.
 *
 * Port of TradLyte-app/app/learn.tsx — RN layout replaced with Tailwind/web.
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import LearnFlow from "@/components/education/LearnFlow";

const Learn = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      {/* Top bar: back button */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-surface-primary/95 px-6 py-3 backdrop-blur-sm md:px-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      {/* Page header */}
      <div className="mx-auto w-full max-w-[860px] px-6 pt-10 md:px-10">
        <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">
          Indicator Lab
        </p>
        <h1 className="mt-2 font-serif text-[32px] font-medium leading-tight text-fg-primary">
          Learn by doing
        </h1>
        <p className="mt-2 max-w-[520px] text-[15px] leading-relaxed text-fg-secondary">
          Five interactive lessons — drag the controls and watch the math react live. No formulas, no lectures.
        </p>
      </div>

      {/* Main content */}
      <main className="mx-auto w-full max-w-[860px] flex-1 px-6 pb-20 pt-8 md:px-10">
        <LearnFlow />
      </main>
    </div>
  );
};

export default Learn;
