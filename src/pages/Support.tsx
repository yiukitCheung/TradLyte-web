import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Search,
  Rocket,
  NotebookPen,
  Trophy,
  CreditCard,
  ShieldCheck,
  Link2,
  Activity,
  Compass,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Mail,
  Clock,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Article = { title: string; body: string[] };

type HelpSection = {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  available: boolean;
  articles: Article[];
  unavailableNote?: string;
};

const SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting started",
    desc: "Find your footing — purpose, dashboard, and your first analysis.",
    available: true,
    articles: [
      {
        title: "Start with your “why”",
        body: [
          "Great investing isn't about predicting the next hot stock — it's about knowing why you're investing at all. When you first sign in, TradLyte asks you to name your purpose: the life you're funding, not just the number you're chasing.",
          "That purpose becomes your anchor. It appears on your dashboard, in your journal, and beside every goal — so when markets get loud, your reason stays louder.",
          "Take two minutes to write it honestly. A clear 'why' is the single best predictor of staying invested when it's hard.",
        ],
      },
      {
        title: "Read your dashboard in one glance",
        body: [
          "Your dashboard is mission control. The top shows your portfolio's value and how it's moved since your entry; just below, “doing great” and “needs attention” surface your best and worst holdings instantly.",
          "Markets-at-a-glance gives you the broad tape, Today's Top Picks surfaces fresh ideas, and News on Your Holdings keeps you current on what you own — all without leaving the page.",
          "Glance daily, act rarely. The dashboard is built to inform calm decisions, not tempt busy ones.",
        ],
      },
      {
        title: "Analyze any stock in seconds",
        body: [
          "Type a ticker in the search bar or tap any pick to open its detail page. You'll see price history, key fundamentals, a 52-week range, recent headlines, and a plain-language read from TradLyte AI.",
          "When a stock fits your purpose, add it to your portfolio with the price you actually paid — so every gain is measured from your entry, not an index's.",
        ],
      },
    ],
  },
  {
    id: "strategy-lab",
    icon: Activity,
    title: "Strategy Lab & backtesting",
    desc: "Test trading ideas on real history before you risk a dollar.",
    available: true,
    articles: [
      {
        title: "Test your idea before you risk a dollar",
        body: [
          "Every strategy sounds smart until the market tests it. The Strategy Lab replays your rules against real historical prices, trade by trade, so you learn what would have happened — for free, with zero risk.",
          "You'll see the return, the win rate, the worst drawdown, and every simulated trade. That's how conviction is built: on evidence, not hope.",
        ],
      },
      {
        title: "Start from a preset, then make it your own",
        body: [
          "New to strategies? Begin with a classic — the Golden Cross, an RSI oversold bounce, a MACD cross, or the faster EMA 8/13. One click runs it on any stock.",
          "Then tweak it: change the moving averages, the stop loss, the entry pattern. The Lab animates what each indicator, candle pattern, and stop actually does, so you understand the strategy you're building — not just the result.",
        ],
      },
      {
        title: "Judge your results honestly",
        body: [
          "A big return with a stomach-churning drawdown isn't a good strategy — it's a lucky one. Read the numbers together: return versus max drawdown, win rate, and how many trades it took to get there.",
          "A strategy you can actually stick with beats a flashy one you'll abandon at the first loss.",
        ],
      },
    ],
  },
  {
    id: "goals",
    icon: Compass,
    title: "Goals & purpose",
    desc: "Turn the life you want into a funded, dated plan.",
    available: true,
    articles: [
      {
        title: "Set goals you'll actually fund",
        body: [
          "A goal with a number and a date is a plan; a wish without them is just pressure. Describe what you're saving for in plain words and let the AI planner shape it into a target, a timeline, and milestones — or add it by hand.",
          "Watch your horizon fill in: each goal becomes a dated milestone your portfolio is working toward.",
        ],
      },
      {
        title: "Let purpose, not panic, drive decisions",
        body: [
          "Your goals and journal exist to remind you why you're investing — especially when the market makes you want to act. Before a big move, glance at your purpose and your goals.",
          "Most impulsive trades don't survive that pause. That pause is the whole point.",
        ],
      },
    ],
  },
  {
    id: "journaling",
    icon: NotebookPen,
    title: "Journaling & debriefs",
    desc: "Reflections, nightly debriefs, and learning from regret.",
    available: true,
    articles: [
      {
        title: "Why journaling makes you a better investor",
        body: [
          "Markets reward discipline, and discipline is a habit you build one reflection at a time. A two-minute journal entry turns a decision into a lesson you can actually learn from.",
          "TradLyte ties each entry to your purpose and your trades, so your journal becomes the story of how you think — not just what you bought.",
        ],
      },
      {
        title: "Run a nightly debrief",
        body: [
          "End the day with three prompts: what you planned before the open, one thing the market taught you, and a small win in discipline. It takes minutes and compounds for years.",
          "Your recent portfolio moves appear right there, ready to reflect on while they're still fresh.",
        ],
      },
      {
        title: "Turn regret into a rule",
        body: [
          "Sold too early? Chased a hyped name? On the dashboard, mark a holding as a regret and journal what you'd do differently next time.",
          "Naming the mistake honestly is how you stop repeating it — and how a personal trading rule is born.",
        ],
      },
    ],
  },
  {
    id: "levels",
    icon: Trophy,
    title: "Levels & rewards",
    desc: "How points, levels, and streaks reward consistency.",
    available: true,
    articles: [
      {
        title: "How points and levels work",
        body: [
          "You earn +25 points every time you save a reflection. As points add up, your identity level grows — from Starting to Reflective, Disciplined, and Seasoned.",
          "Notice what's rewarded here: consistency, not profit. Over a lifetime of investing, the habit is the edge.",
        ],
      },
      {
        title: "Build a streak",
        body: [
          "Journaling on consecutive days builds a streak — a gentle nudge toward the daily habit that separates investors who last from those who don't.",
          "Miss a day? Just start again. The next entry always counts.",
        ],
      },
    ],
  },
  {
    id: "account-billing",
    icon: CreditCard,
    title: "Account & billing",
    desc: "Plans, invoices, and payment methods.",
    available: false,
    articles: [],
    unavailableNote:
      "Not available yet. TradLyte is free while we build — there are no plans, invoices, or payment methods at this time.",
  },
  {
    id: "privacy-security",
    icon: ShieldCheck,
    title: "Privacy & security",
    desc: "How your data is stored and protected.",
    available: false,
    articles: [],
    unavailableNote:
      "Not available yet. Detailed privacy and security documentation is coming soon. Your data lives in your own account and is never sold.",
  },
  {
    id: "broker",
    icon: Link2,
    title: "Connecting your broker",
    desc: "Sync trades automatically.",
    available: false,
    articles: [],
    unavailableNote:
      "Not available yet. Automatic broker syncing is on our roadmap — for now, portfolio tracking is manual: add holdings with the price you paid.",
  },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How are journal points and levels calculated?",
    a: "Every saved reflection earns +25 points. Your level rises as points accumulate — Starting, Building, Steady, Reflective, Disciplined, and beyond. It rewards how consistently you journal, never your profit or loss.",
  },
  {
    q: "What is a backtest, and are the results real?",
    a: "A backtest replays your strategy's rules against real historical prices, simulating every trade it would have taken. The price data is real; the trades are simulated for learning. It's an educational tool — not a prediction or financial advice.",
  },
  {
    q: "How do I add a holding to my portfolio?",
    a: "Search for or open any stock, tap “Add to portfolio,” and enter the price you paid and how many shares. Your returns are then measured from your real entry price.",
  },
  {
    q: "How does the AI goal planner work?",
    a: "Describe a goal in plain language — like “retire by 55 with $780k” — and the planner drafts a title, target amount, date, and milestones. You review and confirm before anything is saved.",
  },
  {
    q: "Can I connect my brokerage account?",
    a: "Not yet. Portfolio tracking is manual for now; automatic broker syncing is on our roadmap.",
  },
  {
    q: "Do you offer paid plans?",
    a: "Not at the moment — TradLyte is free while we build. Account and billing features aren't available yet.",
  },
  {
    q: "Is my data private and secure?",
    a: "Your data is stored in your own account and is never sold or shared. Full privacy and security documentation is coming soon.",
  },
  {
    q: "Is any of this financial advice?",
    a: "No. TradLyte is an educational toolkit for research, reflection, and strategy testing. Nothing here is investment advice — always do your own due diligence.",
  },
];

const Support = () => {
  const [activeId, setActiveId] = useState<string>("getting-started");
  const [openArticle, setOpenArticle] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeSection = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];

  const selectSection = (id: string) => {
    setActiveId(id);
    setOpenArticle(0);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 md:px-10">
        {/* Hero */}
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-4.5 text-center">
          <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Help center</p>
          <h1 className="font-serif text-[38px] font-medium text-fg-primary">Learn to invest with purpose</h1>
          <p className="max-w-[560px] text-[15px] leading-relaxed text-fg-secondary">
            Short, practical guides on using TradLyte to build conviction, stay disciplined, and let your reasons —
            not the noise — steer your money.
          </p>
          <div className="flex w-full max-w-[520px] items-center gap-3 rounded-full border border-border-strong bg-card px-5.5 py-3.5">
            <Search className="h-5 w-5 text-fg-muted" />
            <input placeholder="Search help articles…" className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-muted" />
          </div>
        </div>

        {/* Topic grid */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => {
            const isActive = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSection(s.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border bg-card p-6 text-left transition-all",
                  isActive ? "border-2 border-gold shadow-sm" : "border-border-subtle hover:border-border-strong",
                  !s.available && "opacity-80",
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken">
                  {s.available ? (
                    <s.icon className="h-[21px] w-[21px] text-ink" />
                  ) : (
                    <Lock className="h-[19px] w-[19px] text-fg-muted" />
                  )}
                </span>
                <div>
                  <h3 className="font-serif text-lg font-medium text-fg-primary">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{s.desc}</p>
                </div>
                {s.available ? (
                  <span className="font-cap text-xs font-semibold text-gold-deep">
                    {s.articles.length} article{s.articles.length === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-cap text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                    Not available yet
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active section panel */}
        <div ref={panelRef} className="mt-8 scroll-mt-24 overflow-hidden rounded-2xl border border-border-subtle bg-card">
          <div className="flex items-center gap-3.5 border-b border-border-subtle px-6 py-5 md:px-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken">
              {activeSection.available ? (
                <activeSection.icon className="h-[19px] w-[19px] text-ink" />
              ) : (
                <Lock className="h-[17px] w-[17px] text-fg-muted" />
              )}
            </span>
            <div>
              <h2 className="font-serif text-[22px] font-medium text-fg-primary">{activeSection.title}</h2>
              <p className="font-cap text-xs text-fg-muted">{activeSection.desc}</p>
            </div>
          </div>

          {activeSection.available ? (
            activeSection.articles.map((a, i) => (
              <div key={a.title} className={cn(i < activeSection.articles.length - 1 && "border-b border-border-subtle")}>
                <button
                  type="button"
                  onClick={() => setOpenArticle(openArticle === i ? null : i)}
                  aria-expanded={openArticle === i}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left md:px-8"
                >
                  <span className="font-serif text-[18px] font-medium text-fg-primary">{a.title}</span>
                  <ChevronRight
                    className={cn(
                      "h-5 w-5 flex-shrink-0 text-fg-muted transition-transform",
                      openArticle === i && "rotate-90 text-gold-deep",
                    )}
                  />
                </button>
                {openArticle === i && (
                  <div className="flex flex-col gap-3.5 px-6 pb-6 md:px-8">
                    {a.body.map((p, pi) => (
                      <p key={pi} className="text-[15px] leading-relaxed text-fg-secondary">
                        {p}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken">
                <Lock className="h-5 w-5 text-fg-muted" />
              </span>
              <p className="font-serif text-lg text-fg-primary">Not available yet</p>
              <p className="max-w-md text-[15px] leading-relaxed text-fg-secondary">{activeSection.unavailableNote}</p>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="mt-12">
          <p className="font-cap text-xs font-semibold uppercase tracking-[0.16em] text-gold-deep">FAQ</p>
          <h2 className="mt-1.5 font-serif text-[26px] font-medium text-fg-primary">Popular questions</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border-subtle bg-card">
            {FAQS.map((f, i) => (
              <div key={f.q} className={cn(i < FAQS.length - 1 && "border-b border-border-subtle")}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-[15px] font-medium text-fg-primary">{f.q}</span>
                  <ChevronDown className={cn("h-5 w-5 flex-shrink-0 text-fg-muted transition-transform", openFaq === i && "rotate-180")} />
                </button>
                {openFaq === i && (
                  <p className="px-6 pb-5 text-sm leading-relaxed text-fg-secondary">{f.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-12 flex flex-col items-start justify-between gap-8 rounded-2xl bg-ink px-8 py-10 md:flex-row md:items-center md:px-12">
          <div className="max-w-[560px]">
            <h2 className="font-serif text-[28px] font-medium text-white">Still need help?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-white/80">
              Our team is here for you. Reach out and we'll get you back to building your strategy in no time.
            </p>
            <span className="mt-2 flex items-center gap-1.5 font-cap text-[13px] text-white/70">
              <Clock className="h-4 w-4 text-gold" /> Avg. response time: under 2 hours
            </span>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <button className="flex items-center gap-2 rounded-full bg-gold px-6 py-3.5 text-sm font-semibold text-fg-primary">
              <MessageCircle className="h-[18px] w-[18px]" /> Chat with us
            </button>
            <a
              href="mailto:support@tradlyte.com"
              className="flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white"
            >
              <Mail className="h-[18px] w-[18px]" /> Email support
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Support;
