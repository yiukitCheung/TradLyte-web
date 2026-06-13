import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  CheckCheck,
  Star,
  Wind,
  AlertTriangle,
  Target,
  Flame,
  Gift,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Note {
  icon: typeof Star;
  tone: "gold" | "positive" | "negative" | "ink";
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const groups: { label: string; items: Note[] }[] = [
  {
    label: "Today",
    items: [
      { icon: Star, tone: "gold", title: "A new top pick matched your purpose", body: "AVGO entered today's scan and aligns with your long-term freedom goal.", time: "2h ago", unread: true },
      { icon: Wind, tone: "ink", title: "Take a breath — post-win cooldown", body: "You're up 23% on NVDA. Consider a 24-hour pause before the next move.", time: "4h ago", unread: true },
      { icon: AlertTriangle, tone: "negative", title: "Regret warning on a watched stock", body: "A stock you flagged before is spiking again. Revisit your reasoning first.", time: "6h ago", unread: false },
    ],
  },
  {
    label: "This week",
    items: [
      { icon: Target, tone: "positive", title: "Goal milestone reached", body: "Your emergency cushion just crossed 78% — on pace for 2026.", time: "Mon", unread: false },
      { icon: Flame, tone: "gold", title: "7-day journaling streak", body: "A full week of reflections. Discipline compounds, just like returns.", time: "Sun", unread: false },
      { icon: Gift, tone: "positive", title: "You earned 120 reward points", body: "Reflections and on-time contributions added up this week.", time: "Sat", unread: false },
    ],
  },
];

const toneStyle: Record<Note["tone"], string> = {
  gold: "bg-gold/20 text-gold-deep",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  ink: "bg-ink/10 text-ink",
};

const Notifications = () => {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unreadCount = groups.flatMap((g) => g.items).filter((n) => n.unread).length;

  const visible = groups
    .map((g) => ({ ...g, items: tab === "unread" ? g.items.filter((n) => n.unread) : g.items }))
    .filter((g) => g.items.length);

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[780px] px-6 py-12">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-serif text-[34px] font-medium text-fg-primary">Notifications</h1>
              <p className="text-[15px] text-fg-secondary">Gentle nudges aligned with your purpose.</p>
            </div>
            <button className="flex items-center gap-1.5 font-cap text-sm font-medium text-gold-deep">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <button
              onClick={() => setTab("all")}
              className={cn("rounded-full px-4.5 py-2 text-sm font-semibold", tab === "all" ? "bg-ink text-white" : "border border-border-strong bg-card text-fg-secondary")}
            >
              All
            </button>
            <button
              onClick={() => setTab("unread")}
              className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium", tab === "unread" ? "bg-ink text-white" : "border border-border-strong bg-card text-fg-secondary")}
            >
              Unread
              <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold", tab === "unread" ? "bg-white text-ink" : "bg-ink text-white")}>{unreadCount}</span>
            </button>
          </div>

          <div className="mt-7 flex flex-col gap-7">
            {visible.map((g) => (
              <div key={g.label} className="flex flex-col gap-3">
                <span className="font-cap text-xs uppercase tracking-[0.12em] text-fg-muted">{g.label}</span>
                <div className="flex flex-col gap-3">
                  {g.items.map((n, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-4 rounded-2xl border bg-card p-5",
                        n.unread ? "border-border-strong" : "border-border-subtle",
                      )}
                    >
                      <span className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full", toneStyle[n.tone])}>
                        <n.icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-semibold text-fg-primary">{n.title}</h3>
                          {n.unread && <span className="h-2 w-2 rounded-full bg-ink" />}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{n.body}</p>
                      </div>
                      <span className="flex-shrink-0 font-cap text-xs text-fg-muted">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
