import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  WandSparkles,
  TrendingUp,
  ArrowRight,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeMonthlyContributions,
  generateMilestones,
  mapUserGoalRow,
  parseAiGoal,
  pickSummitGoalId,
  type UserGoalView,
} from "@/lib/goalUtils";
import { fetchProfilePurpose } from "@/lib/purposeUtils";
import { requestAiChat } from "@/lib/aiChat";

const milestoneChips: Array<{ label: string; prompt: string }> = [
  { label: "Buy a home", prompt: "Save for a home down payment" },
  { label: "Emergency fund", prompt: "Build a 6-month emergency fund" },
  { label: "Kids' college", prompt: "Save for my kids' college education" },
];

const GOAL_PLANNER_SYSTEM =
  "You convert a person's plain-language savings goal into structured JSON. " +
  "Return ONLY a JSON object, no prose, with keys: " +
  '"title" (short label, e.g. "Retirement freedom"), ' +
  '"target_amount" (number in USD, no symbols or commas), ' +
  '"target_date" (YYYY-MM-DD or null if none implied), ' +
  '"why" (one short sentence on the meaning behind it). ' +
  "Infer a sensible target_date from phrases like \"by 55\" or \"in 10 years\" using the current year. " +
  "If an amount is not stated, estimate a reasonable one for the described goal.";

const fmt = (n: number) => `$${n.toLocaleString()}`;
const dateParts = (iso: string | null) => {
  if (!iso) return { year: "—", month: "" };
  const d = new Date(iso);
  return { year: String(d.getFullYear()), month: d.toLocaleDateString("en-US", { month: "long" }) };
};

const statusDot: Record<string, string> = {
  on_track: "bg-positive",
  behind: "bg-negative",
  summit: "bg-ink",
};

const Goals = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<UserGoalView[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [purposeStatement, setPurposeStatement] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fetchGoals = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [{ data, error }, profile] = await Promise.all([
        supabase
          .from("user_goals")
          .select("id, title, description, target_amount, current_amount, target_date, status, milestones")
          .eq("user_id", user.id)
          .order("target_date", { ascending: true, nullsFirst: false }),
        fetchProfilePurpose(user.id),
      ]);

      if (error) throw error;
      setPurposeStatement(profile?.purpose_statement?.trim() || null);

      const rows = data ?? [];
      const summitGoalId = pickSummitGoalId(
        rows.map((g) => ({
          id: g.id,
          target_date: g.target_date,
          target_amount: g.target_amount ? parseFloat(g.target_amount.toString()) : 0,
        })),
      );
      setGoals(rows.map((g) => mapUserGoalRow(g, summitGoalId)));
    } catch (e) {
      console.error("Failed to load goals:", e);
      toast.error("Could not load your goals. Please refresh.");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleAiPlan = async (descOverride?: string) => {
    const description = (descOverride ?? aiInput).trim();
    if (!description) return toast.error("Describe the goal you're saving for");
    if (descOverride) setAiInput(descOverride);
    setAiLoading(true);
    try {
      // Ground the planner in the user's purpose + existing goals so it stays coherent.
      const contextLines = [
        purposeStatement ? `My investing purpose: ${purposeStatement}` : null,
        goals.length
          ? `Goals I already have: ${goals.map((g) => `${g.title} ($${(g.target_amount || 0).toLocaleString()})`).join("; ")}`
          : null,
      ].filter(Boolean);
      const userText = contextLines.length
        ? `${description}\n\nFor context:\n${contextLines.join("\n")}`
        : description;

      const text = await requestAiChat({
        system: GOAL_PLANNER_SYSTEM,
        messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
      });
      const parsed = parseAiGoal(text);
      if (!parsed) {
        toast.error("Couldn't shape that into a goal — try adding it manually.");
        setAddOpen(true);
        return;
      }
      // AI suggests; the user confirms in the dialog before anything is saved.
      setTitle(parsed.title);
      setAmount(String(parsed.target_amount));
      setDate(parsed.target_date ?? "");
      setAddOpen(true);
      toast.success("Drafted your goal — review and create it.");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      const friendly = /invalid api key|authentication|minimax|50\d/i.test(raw)
        ? "AI planner is offline right now — add your goal manually below."
        : raw || "AI planner is unavailable right now";
      toast.error(friendly);
      setAddOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!user) return;
    if (!title.trim()) return toast.error("Please enter a goal title");
    if (!amount || parseFloat(amount) <= 0) return toast.error("Please enter a valid target amount");

    const targetAmount = parseFloat(amount);
    const milestones = generateMilestones(title.trim(), targetAmount).map((m) => ({
      id: m.id,
      title: m.title,
      financialTarget: m.financialTarget,
      description: m.description,
      order: m.order,
    }));

    const { error } = await supabase.from("user_goals").insert({
      user_id: user.id,
      title: title.trim(),
      target_amount: targetAmount,
      current_amount: 0,
      target_date: date || null,
      status: "active",
      milestones: milestones as unknown as Json,
    });
    if (error) return toast.error(error.message || "Failed to create goal");
    toast.success("Goal created!");
    setAddOpen(false);
    setTitle("");
    setAmount("");
    setDate("");
    setAiInput("");
    fetchGoals();
  };

  const totalCommitted = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const contributions = useMemo(() => computeMonthlyContributions(goals), [goals]);
  const monthlyTotal = contributions.reduce((s, c) => s + c.amount, 0);
  const behindCount = goals.filter((g) => g.status === "behind").length;
  const summitGoal = goals.find((g) => g.status === "summit") ?? null;

  const horizonSubtitle =
    goals.length === 0
      ? "Add your first goal and TradLyte will map the path your portfolio is funding."
      : goals.length === 1
        ? "One future with a date attached — the path your portfolio is funding."
        : `${goals.length} futures, each with a date attached. This is the path your portfolio is funding — ordered by when they arrive.`;

  if (authLoading || (loading && goals.length === 0)) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-primary">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <span className="inline-flex items-center gap-2 font-cap text-sm text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your goals…
          </span>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1">
        {/* Masthead */}
        <section className="flex flex-col items-start justify-between gap-8 px-6 pb-7 pt-16 md:flex-row md:items-end md:px-12">
          <div className="max-w-[720px]">
            <p className="font-cap text-[13px] font-medium uppercase tracking-[0.22em] text-gold-deep">Your horizon</p>
            <h1 className="mt-4 font-serif text-[44px] font-medium leading-[1.04] text-fg-primary md:text-[54px]">
              The years you're investing in.
            </h1>
            <p className="mt-3 max-w-[520px] text-[17px] leading-relaxed text-fg-secondary">{horizonSubtitle}</p>
            {purposeStatement && (
              <p className="mt-4 max-w-[520px] border-l-2 border-gold pl-4 font-serif text-[17px] italic leading-relaxed text-fg-primary">
                “{purposeStatement}”
              </p>
            )}
          </div>
          <div className="flex flex-col items-start md:items-end">
            <span className="font-cap text-[13px] text-fg-muted">
              {goals.length === 0 ? "No goals yet" : `Committed across ${goals.length} goal${goals.length === 1 ? "" : "s"}`}
            </span>
            <span className="mt-2 font-serif text-[40px] font-medium text-fg-primary md:text-[46px]">
              {goals.length === 0 ? "—" : fmt(totalCommitted)}
            </span>
            {goals.length > 0 && (
              <span
                className={cn(
                  "mt-2.5 flex items-center gap-1.5 rounded-full px-3 py-1.5 font-cap text-[13px] font-medium",
                  behindCount > 0 ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive",
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {behindCount > 0
                  ? `${behindCount} goal${behindCount === 1 ? "" : "s"} behind pace`
                  : summitGoal?.target_date
                    ? `On pace toward ${dateParts(summitGoal.target_date).year}`
                    : `${fmt(totalSaved)} saved so far`}
              </span>
            )}
          </div>
        </section>

        {/* AI Planner */}
        <section className="border-y border-border-subtle bg-surface-sunken px-6 py-14 md:px-12">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-[760px]">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold-deep" />
                <span className="font-cap text-[13px] font-medium uppercase tracking-[0.22em] text-gold-deep">AI goal setting</span>
              </span>
              <h2 className="mt-3 font-serif text-[34px] font-medium leading-tight text-fg-primary md:text-[40px]">
                Set your next goal with AI.
              </h2>
              <p className="mt-3 max-w-[600px] text-base leading-relaxed text-fg-secondary">
                Describe the future you want and TradLyte turns it into a structured goal — a target, a monthly number, and milestones that drop straight onto your horizon.
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-border-strong bg-card px-3.5 py-2.5 font-cap text-[13px] font-medium text-fg-secondary">
              <WandSparkles className="h-3.5 w-3.5 text-gold-deep" /> Powered by TradLyte AI
            </span>
          </div>

          <div className="mt-7 max-w-[440px] rounded-2xl bg-surface-inverse p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-ink">
                <Sparkles className="h-4 w-4 text-gold-tertiary" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">TradLyte AI</div>
                <div className="font-cap text-[11px] text-white/50">Goal planner</div>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-white/85">
              Tell me what you're saving for and by when. I'll shape it into a goal with milestones, a monthly amount, and a realistic completion date.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAiPlan();
              }}
              className="mt-5 flex w-full items-center gap-3 rounded-full border border-white/15 bg-white/10 py-1.5 pl-5 pr-1.5"
            >
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                disabled={aiLoading}
                placeholder={'Describe a goal — "retire by 55 with $780k"'}
                className="flex-1 bg-transparent font-cap text-sm text-white outline-none placeholder:text-white/50 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                aria-label="Plan goal with AI"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold transition-opacity disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-fg-primary" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-fg-primary" />
                )}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-3 font-cap text-xs text-white/50 underline-offset-2 transition-colors hover:text-white/80 hover:underline"
            >
              or add one manually
            </button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New goal</DialogTitle>
                  <DialogDescription>Name it, set a target, and pick when you want it funded.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-fg-primary">Title</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Retirement freedom" className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-fg-primary">Target ($)</label>
                      <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="780000" className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-fg-primary">Target date</label>
                      <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="w-full rounded-md border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <button onClick={() => setAddOpen(false)} className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-fg-primary">Cancel</button>
                  <button onClick={handleAddGoal} className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Create goal</button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="mt-4 flex flex-wrap gap-2">
              {milestoneChips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  disabled={aiLoading}
                  onClick={() => void handleAiPlan(c.prompt)}
                  className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 font-cap text-[13px] text-white/80 transition-colors hover:border-gold/60 hover:bg-white/20 disabled:opacity-50"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="px-6 pt-9 md:px-12">
          <div className="flex items-center justify-between pb-5">
            <span className="font-cap text-xs font-medium uppercase tracking-[0.15em] text-fg-muted">
              {goals.length === 0 ? "No milestones yet" : `${goals.length} milestone${goals.length === 1 ? "" : "s"} · nearest first`}
            </span>
            {goals.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-cap text-xs text-fg-secondary"><span className="h-2 w-2 rounded-full bg-positive" /> On track</span>
                <span className="flex items-center gap-1.5 font-cap text-xs text-fg-secondary"><span className="h-2 w-2 rounded-full bg-negative" /> Behind pace</span>
              </div>
            )}
          </div>
          {goals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-card px-8 py-14 text-center">
              <p className="font-serif text-2xl text-fg-primary">Your horizon is empty</p>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fg-secondary">
                Create a goal above to see it on your timeline — target amount, progress, and milestones pulled from your account.
              </p>
              <button
                onClick={() => setAddOpen(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Add your first goal
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {goals.map((g, i) => {
                const { year, month } = dateParts(g.target_date);
                const summit = g.status === "summit";
                const description =
                  g.description ||
                  g.milestones.find((m) => !m.completed)?.description ||
                  g.milestones[0]?.description ||
                  null;
                return (
                  <div key={g.id} className="flex gap-0">
                    <div className="w-[132px] flex-shrink-0 pt-1 text-right md:pr-6">
                      <div className="font-serif text-3xl font-medium text-fg-primary">{year}</div>
                      <div className="font-cap text-xs text-fg-muted">{month}</div>
                    </div>
                    <div className="flex w-9 flex-shrink-0 flex-col items-center">
                      <span className={cn("rounded-full border-[3px] border-surface-primary", statusDot[g.status || "on_track"], summit ? "h-[18px] w-[18px]" : "h-3.5 w-3.5")} />
                      {i < goals.length - 1 && <span className="w-0.5 flex-1 bg-border-strong" />}
                    </div>
                    <div className="flex-1 pb-9">
                      <div className={cn("rounded-2xl border bg-card px-6 py-5.5", summit ? "border-[1.5px] border-gold bg-[#F2ECDF]" : "border-border-subtle")}>
                        <div className="flex items-center justify-between">
                          <h3 className="font-serif text-xl font-medium text-fg-primary">{g.title}</h3>
                          <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 font-cap text-[11px] font-medium", g.status === "behind" ? "bg-negative-soft text-negative" : "bg-positive-soft text-positive")}>
                            {g.status === "behind" ? "Behind pace" : g.progress >= 100 ? "Complete" : "On track"}
                          </span>
                        </div>
                        {description && (
                          <p className="mt-2.5 text-[15px] leading-relaxed text-fg-secondary">{description}</p>
                        )}
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <div className="font-cap text-xs text-fg-muted">{fmt(g.current_amount || 0)} of {fmt(g.target_amount || 0)}</div>
                            <div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-surface-sunken">
                              <div className={cn("h-2 rounded-full", summit ? "bg-ink" : "bg-gold-deep")} style={{ width: `${g.progress}%` }} />
                            </div>
                          </div>
                          <span className="font-serif text-2xl font-medium text-fg-primary">{Math.round(g.progress)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Contributions */}
        {goals.length > 0 && (
          <section className="px-6 pb-16 pt-4 md:px-12">
            <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-card p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-cap text-[13px] uppercase tracking-wide text-fg-muted">Contributions &amp; pace</p>
                  <h3 className="mt-2 font-serif text-[28px] font-medium text-fg-primary">How you're funding the horizon</h3>
                </div>
                <span className="font-cap text-[13px] text-fg-muted">Estimated monthly to stay on pace</span>
              </div>
              <div className="flex flex-col gap-5">
                {contributions.map((c) => (
                  <div key={c.goalId} className="flex items-center gap-6">
                    <span className="w-56 flex-shrink-0 text-[15px] font-medium text-fg-primary">{c.goal}</span>
                    <div className="h-[18px] flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <div className="h-[18px] rounded-full bg-gold-deep" style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="w-20 text-right font-serif text-[19px] font-medium text-fg-primary">
                      {c.amount > 0 ? fmt(c.amount) : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="h-px w-full bg-border-subtle" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="font-serif text-[22px] font-medium text-fg-primary">
                    {monthlyTotal > 0 ? `${fmt(monthlyTotal)} / month` : "Set target dates to estimate pace"}
                  </span>
                </div>
                <span className="flex items-center gap-2 text-sm text-fg-secondary">
                  <span className={cn("h-[7px] w-[7px] rounded-full", behindCount > 0 ? "bg-negative" : "bg-positive")} />
                  {behindCount > 0
                    ? "Some goals need more monthly savings to catch up"
                    : "At this estimated pace, goals with dates can stay on track"}
                </span>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Goals;
