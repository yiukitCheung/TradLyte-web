import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
import { useRequireOnboarding } from "@/hooks/useRequireOnboarding";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { consecutiveJournalDays } from "@/lib/journalStreak";
import {
  LOG_ROW_LABELS,
  buildDebriefQuestions,
  findTodayEntry,
  formatLogContent,
  mapPortfolioToDecisions,
  parseLogContent,
  type JournalEntryView,
} from "@/lib/journalUtils";
import {
  nextLevelThresholdPoints,
  POINTS_PER_JOURNAL_ENTRY,
  rewardLevelFromPoints,
  rewardLevelLabel,
} from "@/lib/rewards";
import { fetchProfilePurpose, purposeReflectionQuestion } from "@/lib/purposeUtils";
import { toast } from "sonner";
import { Flame, TrendingUp, TrendingDown, Check, ArrowRight, Feather, Loader2, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const logRows = [
  { label: LOG_ROW_LABELS[0], placeholder: "What did you plan before the open?" },
  { label: LOG_ROW_LABELS[1], placeholder: "One thing the market taught you." },
  { label: LOG_ROW_LABELS[2], placeholder: "A moment of discipline worth noting." },
];

type PortfolioRow = {
  asset_name: string;
  purchase_price: number | null;
  current_price: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const Journal = () => {
  const { user, loading: authLoading } = useRequireOnboarding();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<JournalEntryView[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [purposeStatement, setPurposeStatement] = useState<string | null>(null);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchJournalData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [entriesResult, portfolioResult, profile] = await Promise.all([
        supabase
          .from("journal_entries")
          .select("id, title, content, mood, tags, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60),
        supabase
          .from("user_portfolio")
          .select("asset_name, purchase_price, current_price, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        fetchProfilePurpose(user.id),
      ]);

      if (entriesResult.error) throw entriesResult.error;

      const loaded = (entriesResult.data ?? []) as JournalEntryView[];
      setEntries(loaded);
      setPortfolio((portfolioResult.data ?? []) as PortfolioRow[]);
      setPurposeStatement(profile?.purpose_statement?.trim() || null);
      setPrimaryGoal(profile?.primary_goal?.trim() || null);

      const todayEntry = findTodayEntry(loaded);
      if (todayEntry) {
        const parsed = parseLogContent(todayEntry.content);
        setLog({
          [LOG_ROW_LABELS[0]]: parsed[LOG_ROW_LABELS[0]],
          [LOG_ROW_LABELS[1]]: parsed[LOG_ROW_LABELS[1]],
          [LOG_ROW_LABELS[2]]: parsed[LOG_ROW_LABELS[2]],
        });
      } else {
        setLog({});
      }

      if (portfolioResult.error) {
        console.warn("Portfolio load for journal failed:", portfolioResult.error.message);
      }
    } catch (e) {
      console.error("Failed to load journal:", e);
      toast.error("Could not load your journal. Please refresh.");
      setEntries([]);
      setPortfolio([]);
      setLog({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchJournalData();
  }, [fetchJournalData]);

  // Arriving from a "regret" on the dashboard — seed a reflection prompt for that symbol.
  useEffect(() => {
    if (loading) return;
    if (searchParams.get("reflect") !== "regret") return;
    const symbol = searchParams.get("symbol")?.toUpperCase();
    if (symbol) {
      setLog((l) =>
        l[LOG_ROW_LABELS[1]]?.trim()
          ? l
          : { ...l, [LOG_ROW_LABELS[1]]: `Reflecting on ${symbol} — what would I do differently next time?` },
      );
      toast.message(`Take a moment to reflect on ${symbol}.`);
    }
    setSearchParams({}, { replace: true });
  }, [loading, searchParams, setSearchParams]);

  const todayEntries = useMemo(
    () => entries.filter((e) => e.created_at && isSameDay(parseISO(e.created_at), new Date())),
    [entries],
  );

  const decisions = useMemo(
    () => mapPortfolioToDecisions(portfolio, todayEntries),
    [portfolio, todayEntries],
  );

  const debriefQuestions = useMemo(() => buildDebriefQuestions(decisions), [decisions]);

  const streakDays = useMemo(
    () => consecutiveJournalDays(entries.map((e) => e.created_at)),
    [entries],
  );

  const rewardPoints = entries.length * POINTS_PER_JOURNAL_ENTRY;
  const rewardLevel = rewardLevelFromPoints(rewardPoints);
  const nextTierAt = nextLevelThresholdPoints(rewardPoints);
  const progressToNext =
    nextTierAt != null ? Math.min(100, (rewardPoints / nextTierAt) * 100) : 100;

  const pendingCount = decisions.filter((d) => !d.reflected).length;
  const answeredDebrief = debriefQuestions.filter((q) => !q.pending).length;

  const handleSave = async () => {
    if (!user) return;
    if (logRows.every((r) => !log[r.label]?.trim())) {
      return toast.error("Write at least one reflection before saving.");
    }

    const content = formatLogContent(log);
    const todayEntry = findTodayEntry(entries);
    setSaving(true);

    try {
      if (todayEntry) {
        const { error } = await supabase
          .from("journal_entries")
          .update({
            content,
            title: `Reflection · ${new Date().toLocaleDateString()}`,
            mood: "Reflective",
          })
          .eq("id", todayEntry.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journal_entries").insert({
          user_id: user.id,
          title: `Reflection · ${new Date().toLocaleDateString()}`,
          content,
          mood: "Reflective",
        });
        if (error) throw error;
      }

      toast.success(`Reflection saved · +${POINTS_PER_JOURNAL_ENTRY} points`);
      await fetchJournalData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save reflection";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <span className="inline-flex items-center gap-2 font-cap text-sm text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your journal…
          </span>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  const firstName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

  const now = new Date();
  const dateStr = format(now, "EEEE, MMMM d").toUpperCase();
  const timeStr = format(now, "h:mm a");
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-7 px-6 py-9 md:px-10">
        {/* Hero level zone */}
        <section className="overflow-hidden rounded-2xl bg-ink p-8 md:px-10">
          <div className="flex items-center justify-between">
            <span className="font-cap text-[13px] font-medium uppercase tracking-[0.12em] text-[#9BA5BF]">
              {dateStr} · {timeStr}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-[#2E4170] px-3.5 py-1.5 font-cap text-[13px] font-semibold text-gold">
              <Flame className="h-4 w-4" />
              {streakDays > 0 ? `${streakDays}-day streak` : "Start your streak"}
            </span>
          </div>
          <div className="mt-6 flex flex-col items-start justify-between gap-12 md:flex-row md:items-end">
            <div className="flex-1">
              <h1 className="font-serif text-[34px] font-medium text-white">
                {greeting}, {firstName}
              </h1>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-cap text-sm text-gold-tertiary">
                  Level {rewardLevel} · {rewardLevelLabel(rewardLevel)}
                </span>
                <span className="font-cap text-xs text-white/50">
                  {rewardPoints} / {nextTierAt ?? rewardPoints} pts
                </span>
              </div>
              <div className="mt-3 h-2 w-full max-w-[420px] overflow-hidden rounded-full bg-white/15">
                <div className="h-2 rounded-full bg-gold" style={{ width: `${progressToNext}%` }} />
              </div>
            </div>
            <div className="flex w-full max-w-[360px] flex-col gap-3.5 rounded-2xl bg-[#2E4170] p-6">
              <span className="font-cap text-[11px] uppercase tracking-wide text-gold-tertiary">Tonight's prompt</span>
              <p className="font-serif text-xl font-medium leading-snug text-white">
                {pendingCount > 0
                  ? `${pendingCount} trade${pendingCount === 1 ? "" : "s"} still waiting for your why.`
                  : decisions.length > 0
                    ? "Your trades are journaled — capture how you felt about today."
                    : entries.length === 0
                      ? "Start with a short reflection on why you invest."
                      : "Write a few lines about today's discipline or lesson."}
              </p>
              <a href="#debrief" className="flex items-center justify-center gap-2 rounded-full bg-gold py-3 text-sm font-semibold text-fg-primary">
                {pendingCount > 0 ? "Start tonight's debrief" : "Open today's log"}{" "}
                <ArrowRight className="h-4 w-4" />
              </a>
              <span className="font-cap text-xs text-[#9BA5BF]">
                {entries.length} saved entr{entries.length === 1 ? "y" : "ies"} · +{POINTS_PER_JOURNAL_ENTRY} pts per save
              </span>
            </div>
          </div>
        </section>

        {/* Why you trade — anchor reflection to purpose */}
        <section className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-card p-6 md:flex-row md:items-center md:justify-between md:gap-8 md:p-7">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gold/15">
              <Compass className="h-5 w-5 text-gold-deep" />
            </span>
            <div>
              <p className="font-cap text-[11px] font-semibold uppercase tracking-wide text-gold-deep">Why you trade</p>
              {purposeStatement ? (
                <p className="mt-1.5 font-serif text-xl italic leading-snug text-fg-primary">“{purposeStatement}”</p>
              ) : (
                <p className="mt-1.5 text-[15px] leading-relaxed text-fg-secondary">
                  You haven't named your purpose yet — it's the anchor every reflection comes back to.{" "}
                  <button onClick={() => navigate("/onboarding")} className="font-medium text-ink underline-offset-2 hover:underline">
                    Set your purpose
                  </button>
                </p>
              )}
              <p className="mt-2 text-[14px] leading-relaxed text-fg-secondary">{purposeReflectionQuestion(primaryGoal)}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/goals")}
            className="flex flex-shrink-0 items-center gap-1.5 self-start rounded-full border border-border-strong px-4 py-2.5 font-cap text-[13px] font-medium text-fg-primary transition-colors hover:border-ink md:self-center"
          >
            Review goals <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>

        {/* Decisions */}
        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-[22px] font-semibold text-fg-primary">Today's Decisions</h2>
              {pendingCount > 0 && (
                <span className="rounded-full bg-negative-soft px-3 py-1.5 font-cap text-xs font-medium text-negative">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <span className="font-cap text-[13px] text-fg-muted">From portfolio activity today</span>
          </div>
          {decisions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-card px-8 py-10 text-center">
              <p className="font-serif text-xl text-fg-primary">No portfolio moves today</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-secondary">
                When you add or update holdings, they show up here for reflection. You can still save today's log below.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {decisions.map((d) => (
                <div
                  key={d.symbol}
                  className={cn(
                    "flex flex-col gap-3.5 rounded-md bg-card p-5",
                    d.reflected ? "border border-border-subtle" : "border-[1.5px] border-gold",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg font-semibold text-fg-primary">{d.symbol}</span>
                    <span className={cn("flex items-center gap-1 font-cap text-[13px] font-semibold", d.up ? "text-positive" : "text-negative")}>
                      {d.up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {d.change}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-cap text-xs text-fg-muted">
                    <span>{d.side} · {d.name}</span>
                  </div>
                  {d.reflected ? (
                    <span className="flex items-center justify-center gap-2 py-2.5 font-cap text-[13px] font-medium text-positive">
                      <Check className="h-4 w-4" /> Reflected
                    </span>
                  ) : (
                    <a href="#debrief" className="flex items-center justify-center rounded-md bg-ink py-2.5 text-sm font-semibold text-white">
                      Journal this
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Debrief */}
        <section id="debrief" className="flex flex-col gap-4.5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-serif text-[22px] font-semibold text-fg-primary">Tonight's debrief</h2>
              <p className="font-cap text-[13px] text-fg-muted">
                {debriefQuestions.length > 0
                  ? "Reflective prompts from today's activity"
                  : "General prompts — write your answers in today's log"}
              </p>
            </div>
            {debriefQuestions.length > 0 && (
              <span className="rounded-full bg-surface-sunken px-3.5 py-2 font-cap text-[13px] text-fg-secondary">
                {answeredDebrief} of {debriefQuestions.length} answered
              </span>
            )}
          </div>
          {debriefQuestions.length === 0 ? (
            <div className="flex flex-col gap-4">
              {[
                "What did you plan before the open — and what actually happened?",
                "One lesson the market taught you today.",
                "A small win in discipline worth noting.",
              ].map((q) => (
                <div
                  key={q}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-surface-sunken p-6"
                >
                  <p className="font-serif text-lg font-medium text-fg-primary">{q}</p>
                  <span className="flex-shrink-0 rounded-full bg-gold/20 px-3 py-1.5 font-cap text-xs font-medium text-gold-deep">
                    {todayEntries.length > 0 ? "Logged" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {debriefQuestions.map((q) => (
                <div
                  key={q.symbol}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-2xl bg-surface-sunken p-6",
                    q.pending ? "border-[1.5px] border-gold" : "border border-border-subtle",
                  )}
                >
                  <div>
                    <span className="font-cap text-[11px] font-semibold uppercase tracking-wide text-gold-deep">{q.symbol}</span>
                    <p className="mt-1.5 font-serif text-lg font-medium text-fg-primary">{q.q}</p>
                  </div>
                  <span className={cn("flex-shrink-0 rounded-full px-3 py-1.5 font-cap text-xs font-medium", q.pending ? "bg-gold/20 text-gold-deep" : "bg-positive-soft text-positive")}>
                    {q.pending ? "Pending" : "Answered"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Log & Save */}
        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-card">
          <div className="flex items-center justify-between px-6 pt-5">
            <h2 className="font-serif text-[19px] font-medium text-fg-primary">Today's log</h2>
            <span className="font-cap text-xs text-fg-muted">
              {todayEntries.length > 0 ? "Synced from your account" : "Free-form"}
            </span>
          </div>
          <div className="flex flex-col gap-3.5 p-6">
            {logRows.map((r) => (
              <div key={r.label} className="flex flex-col gap-2 rounded-md border border-border-subtle bg-surface-primary px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-40 flex-shrink-0 font-cap text-[13px] font-semibold text-fg-secondary">{r.label}</span>
                <input
                  value={log[r.label] || ""}
                  onChange={(e) => setLog((l) => ({ ...l, [r.label]: e.target.value }))}
                  placeholder={r.placeholder}
                  className="flex-1 bg-transparent text-sm text-fg-primary outline-none placeholder:text-fg-muted"
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-6 py-4">
            <span className="text-sm text-fg-muted">
              Saving today's reflection earns you +{POINTS_PER_JOURNAL_ENTRY} points toward your next tier.
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2.5 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Feather className="h-4 w-4" /> {saving ? "Saving…" : todayEntries.length > 0 ? "Update reflection" : "Save reflection"}
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Journal;
