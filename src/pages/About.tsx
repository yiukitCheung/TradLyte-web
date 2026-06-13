import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Chip } from "@/components/Chip";
import { Compass, TrendingUp, NotebookPen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const pillars = [
  {
    num: "01",
    icon: Compass,
    title: "Discover & research",
    body: "Surface ideas that fit your life and values. Screen, compare, and understand a stock before it ever enters your portfolio — depth without the noise.",
  },
  {
    num: "02",
    icon: TrendingUp,
    title: "Build & track from your entry price",
    body: "Compose strategies without code and measure everything from the price you actually paid. Your progress is yours — not an index's, not the crowd's.",
  },
  {
    num: "03",
    icon: NotebookPen,
    title: "Reflect with purpose & guardrails",
    body: "Journal your decisions, run purpose checks, and lean on wellbeing guardrails that keep emotion and hype from steering your money.",
  },
];

const values = [
  ["Clarity over hype", "Purpose first", "Calm by design"],
  ["Your entry, your truth", "Wellbeing guardrails", "Long-term thinking"],
  ["No noise", "Honest tools", "Money as a means"],
];

const About = () => (
  <div className="flex min-h-screen flex-col bg-surface-primary">
    <Header />
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-surface-primary">
        <div className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-24 md:px-12">
          <p className="font-cap text-sm uppercase tracking-[0.14em] text-gold-deep">
            About TradLyte
          </p>
          <h1 className="mt-6 max-w-[980px] font-serif text-[44px] font-medium leading-[1.03] text-fg-primary md:text-7xl">
            Investing as a path to meaning
          </h1>
          <div className="mt-8 flex flex-col gap-10 md:flex-row md:gap-16">
            <p className="max-w-[560px] text-xl leading-relaxed text-fg-secondary">
              Money is a tool, not a trophy. TradLyte helps you invest toward the things
              that actually matter — family, freedom, a passion, a legacy — with clarity
              instead of hype.
            </p>
            <div className="flex max-w-[360px] flex-col gap-3.5">
              <span className="h-[3px] w-12 bg-gold" />
              <p className="text-base leading-relaxed text-fg-muted">
                Built for people who want their portfolio to mean something — calm,
                deliberate, and tied to a life worth funding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="border-y border-border-subtle bg-card">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-6 py-[72px] md:flex-row md:gap-20 md:px-12">
          <div className="md:w-[420px] md:flex-shrink-0">
            <p className="font-cap text-[13px] uppercase tracking-[0.14em] text-gold-deep">
              What we do
            </p>
            <h2 className="mt-4 font-serif text-[32px] font-medium leading-tight text-fg-primary md:text-[38px]">
              An investing companion built around your why.
            </h2>
          </div>
          <div className="flex flex-1 flex-col gap-6 text-lg leading-relaxed text-fg-secondary">
            <p>
              TradLyte brings discovery, strategy, and reflection into one calm workflow.
              You find ideas that fit your life, build and track strategies measured from
              your own entry price, and stay grounded in the purpose behind every decision.
            </p>
            <p>
              No flashing tickers, no pressure to chase the crowd. Just the tools to invest
              deliberately — and the guardrails to keep you well while you do it.
            </p>
          </div>
        </div>
      </section>

      {/* How we do it */}
      <section className="bg-surface-primary">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:px-12">
          <p className="font-cap text-[13px] uppercase tracking-[0.14em] text-gold-deep">
            How we do it
          </p>
          <h2 className="mt-3.5 max-w-[760px] font-serif text-[34px] font-medium leading-[1.08] text-fg-primary md:text-[44px]">
            Three pillars, one calm rhythm
          </h2>
          <div className="mt-11 grid grid-cols-1 gap-6 md:grid-cols-3">
            {pillars.map((p) => (
              <div
                key={p.num}
                className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-sunken">
                    <p.icon className="h-[22px] w-[22px] text-ink" />
                  </div>
                  <span className="font-serif text-2xl font-medium text-gold">{p.num}</span>
                </div>
                <h3 className="font-serif text-2xl font-medium leading-snug text-fg-primary">
                  {p.title}
                </h3>
                <p className="text-base leading-relaxed text-fg-secondary">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-border-subtle bg-card">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-6 py-16 md:flex-row md:gap-[72px] md:px-12">
          <div className="md:w-[360px] md:flex-shrink-0">
            <p className="font-cap text-[13px] uppercase tracking-[0.14em] text-gold-deep">
              What we stand for
            </p>
            <h2 className="mt-3.5 font-serif text-[28px] font-medium leading-tight text-fg-primary md:text-[34px]">
              The values behind every feature.
            </h2>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {values.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-3">
                {row.map((v) => (
                  <Chip key={v}>{v}</Chip>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-primary">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-20 md:px-12">
          <div className="flex flex-col items-start justify-between gap-12 rounded-2xl bg-surface-inverse px-8 py-16 md:flex-row md:items-center md:px-14">
            <div className="max-w-[640px]">
              <p className="font-cap text-[13px] uppercase tracking-[0.14em] text-gold">
                Start your journey
              </p>
              <h2 className="mt-4 font-serif text-[34px] font-medium leading-[1.08] text-white md:text-[44px]">
                Put your money to work on what matters.
              </h2>
              <p className="mt-4 max-w-[520px] text-lg leading-relaxed text-white/70">
                Create a free account and start investing with purpose — no credit card, no noise.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-3.5">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full bg-gold px-[30px] py-4 text-base font-semibold text-fg-primary transition-opacity hover:opacity-90"
              >
                Sign up free
                <ArrowRight className="h-[17px] w-[17px]" />
              </Link>
              <Link
                to="/#how-it-works"
                className="inline-flex items-center rounded-full border border-white/25 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default About;
