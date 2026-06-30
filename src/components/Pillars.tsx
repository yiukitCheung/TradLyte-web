import { Compass, Search, Blocks, TrendingUp, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/Reveal";

const pillars = [
  {
    icon: Compass,
    title: "Top picks, curated to you",
    body: "We sift the noisy feed so you don't. A short, daily shortlist matched to your purpose and goals — the signal, surfaced.",
  },
  {
    icon: Search,
    title: "Research, already done",
    body: "AI and data-science do the heavy lifting, then hand you the answer in plain language — the 'what' and the 'why,' no spreadsheets.",
  },
  {
    icon: Blocks,
    title: "Build, and actually understand",
    body: "Compose a strategy with no code. Gentle animations reveal the math behind every indicator, so you grasp the principle — not just the toggle.",
  },
  {
    icon: TrendingUp,
    title: "Track, without the worry",
    body: "Stop-loss and take-profit are set automatically from the strategy you chose. No manual babysitting — growth measured from your entry, not the market's mood.",
  },
  {
    icon: HeartHandshake,
    title: "Reflect — the part that matters",
    body: "Every trade ends here. Journal, sit with the regrets and the wins, and reconnect with why you invest. This is the whole point.",
    accent: true,
  },
];

const Pillars = () => (
  <section className="bg-surface-primary">
    <div className="mx-auto w-full max-w-[1100px] px-6 pb-28 pt-16 md:px-12 md:pb-36 md:pt-24">
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
