import { Target, NotebookPen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/landing/Reveal";

const goals = [
  { label: "Family home fund", pct: 64 },
  { label: "Travel & freedom", pct: 42 },
];

const PreviewBand = () => (
  <section className="bg-surface-primary">
    <div className="mx-auto w-full max-w-[1100px] px-6 py-28 md:px-12 md:py-36">
      <Reveal className="max-w-2xl">
        <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">After you register</p>
        <h2 className="mt-5 font-serif text-[34px] font-medium leading-tight text-fg-primary md:text-[44px]">
          Tie every decision back to your life.
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-fg-secondary">
          Goals and a reflection journal keep wealth-building honest — so money stays a tool, not the destination.
        </p>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Reveal delay={80}>
          <div className="flex h-full flex-col gap-8 rounded-3xl border border-border-subtle bg-card p-8 md:p-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-gold-deep" />
                <h3 className="font-serif text-2xl font-medium text-fg-primary">Goals</h3>
              </div>
              <span className="rounded-full border border-border-subtle bg-surface-sunken px-2.5 py-1 font-cap text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                Example
              </span>
            </div>
            <div className="flex flex-col gap-5">
              {goals.map((g) => (
                <div key={g.label} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-fg-primary">{g.label}</span>
                    <span className="text-fg-muted">{g.pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="landing-progress h-2 rounded-full bg-gold-deep"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/auth"
              className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Set your first goal
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="flex h-full flex-col gap-8 rounded-3xl border border-border-subtle bg-card p-8 md:p-10">
            <div className="flex items-center gap-3">
              <NotebookPen className="h-5 w-5 text-gold-deep" />
              <h3 className="font-serif text-2xl font-medium text-fg-primary">Journal</h3>
            </div>
            <div className="flex flex-col gap-4">
              <p className="max-w-sm rounded-2xl bg-surface-sunken px-5 py-4 text-[15px] leading-relaxed text-fg-secondary">
                What did the market teach me today?
              </p>
              <p className="ml-auto max-w-sm rounded-2xl bg-ink px-5 py-4 text-[15px] leading-relaxed text-white">
                I held through the dip — my plan, not my fear, made the call.
              </p>
            </div>
            <Link
              to="/auth"
              className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-border-strong px-6 py-3.5 text-[15px] font-semibold text-fg-primary transition-colors hover:bg-surface-sunken"
            >
              Start reflecting
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

export default PreviewBand;
