import { Compass, Search, Blocks, TrendingUp, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/Reveal";

const pillars = [
  {
    icon: Compass,
    title: "Discover",
    body: "Curated picks and calm research — ideas framed around your purpose, not hype.",
  },
  {
    icon: Search,
    title: "Research",
    body: "Live prices, news, and context on any ticker when you want to go deeper.",
  },
  {
    icon: Blocks,
    title: "Build",
    body: "Strategy Lab lets you backtest in plain language — no code, no guesswork.",
  },
  {
    icon: TrendingUp,
    title: "Track",
    body: "Growth measured from your entry price and goals, not the market's daily mood.",
  },
  {
    icon: HeartHandshake,
    title: "Reflect",
    body: "Journal, log regrets, and pause after wins — guardrails for emotional trading.",
    accent: true,
  },
];

const Pillars = () => (
  <section className="bg-surface-primary">
    <div className="mx-auto w-full max-w-[1100px] px-6 py-28 md:px-12 md:py-36">
      <Reveal stagger={90} className="mx-auto max-w-2xl text-center">
        <p className="font-cap text-sm uppercase tracking-[0.18em] text-gold-deep">Why TradLyte</p>
        <h2 className="mt-5 font-serif text-[34px] font-medium leading-tight text-fg-primary md:text-[44px]">
          Everything you need. Nothing you don't.
        </h2>
        <p className="mt-5 text-[17px] leading-relaxed text-fg-secondary">
          Five connected pillars that keep decisions aligned with what matters — not with the headlines.
        </p>
      </Reveal>

      <div className="mt-20 flex flex-col gap-6">
        {pillars.map((p, i) => (
          <Reveal key={p.title} delay={i * 80}>
            <div
              className={cn(
                "flex flex-col gap-6 rounded-3xl border p-8 md:flex-row md:items-center md:gap-12 md:p-10",
                p.accent ? "border-transparent bg-surface-inverse" : "border-border-subtle bg-card",
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  p.accent ? "bg-white/10" : "bg-surface-sunken",
                )}
              >
                <p.icon className={cn("h-6 w-6", p.accent ? "text-gold" : "text-gold-deep")} />
              </div>
              <div className="max-w-2xl">
                <h3 className={cn("font-serif text-2xl font-medium md:text-[28px]", p.accent ? "text-white" : "text-fg-primary")}>
                  {p.title}
                </h3>
                <p className={cn("mt-3 text-[16px] leading-relaxed", p.accent ? "text-white/75" : "text-fg-secondary")}>
                  {p.body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default Pillars;
