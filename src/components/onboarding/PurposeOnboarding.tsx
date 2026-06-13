import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  mapExperienceLabel,
  mapRiskLabel,
  mapTimeHorizonLabel,
  saveOnboardingToProfile,
} from "@/lib/purposeUtils";
import {
  Users,
  Palette,
  HeartHandshake,
  Landmark,
  Wallet,
  Sparkles,
  GraduationCap,
  Clock,
  Gauge,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { icon: typeof Users; label: string; sub: string };

interface Step {
  key: string;
  eyebrowQuestion: string;
  support: string;
  options?: Option[];
  textarea?: { placeholder: string };
}

const steps: Step[] = [
  {
    key: "primaryGoal",
    eyebrowQuestion: "What matters most to you?",
    support: "Your answer shapes how TradLyte frames your portfolio. There are no wrong choices — pick the one that feels most true today.",
    options: [
      { icon: Users, label: "Family", sub: "Provide and protect the people I love." },
      { icon: Palette, label: "Passion & craft", sub: "Fund the work that lights me up." },
      { icon: HeartHandshake, label: "Causes I care about", sub: "Put money behind my values." },
      { icon: Landmark, label: "Generational wealth", sub: "Build something that outlasts me." },
      { icon: Wallet, label: "Financial independence", sub: "Make work a choice, not a must." },
      { icon: Sparkles, label: "Something else", sub: "My reason is uniquely mine." },
    ],
  },
  {
    key: "experience",
    eyebrowQuestion: "How would you describe your experience?",
    support: "This tunes how much context we surface — never how much you can do.",
    options: [
      { icon: Sparkles, label: "Just starting", sub: "New to investing and learning." },
      { icon: Gauge, label: "Some experience", sub: "I've made a handful of trades." },
      { icon: GraduationCap, label: "Confident", sub: "I trade with a clear process." },
      { icon: Landmark, label: "Seasoned", sub: "Markets are second nature." },
    ],
  },
  {
    key: "timeHorizon",
    eyebrowQuestion: "What's your time horizon?",
    support: "How patiently your money can work changes what we surface.",
    options: [
      { icon: Clock, label: "A few years", sub: "Goals within reach soon." },
      { icon: Clock, label: "5–10 years", sub: "Steady, medium-term building." },
      { icon: Clock, label: "A decade or more", sub: "Long, compounding patience." },
      { icon: Clock, label: "Mixed", sub: "Different goals, different clocks." },
    ],
  },
  {
    key: "riskTolerance",
    eyebrowQuestion: "How do you feel about risk?",
    support: "We'll keep your guardrails honest to this — you can change it anytime.",
    options: [
      { icon: Gauge, label: "Cautious", sub: "Protect first, grow gently." },
      { icon: Gauge, label: "Balanced", sub: "Some swings for more growth." },
      { icon: Gauge, label: "Bold", sub: "Comfortable with volatility." },
      { icon: Gauge, label: "Not sure yet", sub: "Help me find my line." },
    ],
  },
  {
    key: "firstGoal",
    eyebrowQuestion: "Name your first goal",
    support: "One concrete thing you're investing toward. We'll help you shape the rest.",
    textarea: { placeholder: "e.g. A home down payment by 2028" },
  },
  {
    key: "purposeStatement",
    eyebrowQuestion: "Put your why into words",
    support: "A sentence you'll see when markets get loud. It keeps every decision anchored.",
    textarea: { placeholder: "I invest so that…" },
  },
];

const PurposeOnboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const current = steps[step];
  const value = answers[current.key] || "";
  const canContinue = !!value.trim();

  const setValue = (v: string) => setAnswers((a) => ({ ...a, [current.key]: v }));

  const finish = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to save your purpose");
      navigate("/auth");
      return;
    }

    setSaving(true);
    const result = await saveOnboardingToProfile(user, {
      primaryGoal: answers.primaryGoal || "",
      purposeStatement: answers.purposeStatement || answers.firstGoal || "",
      investmentExperience: mapExperienceLabel(answers.experience ?? ""),
      timeHorizon: mapTimeHorizonLabel(answers.timeHorizon ?? ""),
      riskTolerance: mapRiskLabel(answers.riskTolerance ?? ""),
      firstGoalTitle: answers.firstGoal || null,
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error || "Could not save onboarding");
      return;
    }

    navigate("/dashboard");
  }, [user, answers, navigate]);

  const next = () => {
    if (step === steps.length - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  };
  const back = () => (step === 0 ? navigate("/") : setStep((s) => s - 1));

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary px-6 py-9 md:px-14">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="h-[18px] w-[18px] rounded-full bg-ink" />
          <span className="font-serif text-[22px] font-semibold text-fg-primary">TradLyte</span>
        </div>
        <button
          onClick={() => void finish()}
          disabled={saving}
          className="text-sm text-fg-muted hover:text-fg-primary disabled:opacity-50"
        >
          Save &amp; exit
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-6">
        <div className="flex w-full max-w-[880px] flex-col items-center gap-7">
          <div className="flex w-[300px] gap-2">
            {steps.map((_, i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-ink" : "bg-border-strong")} />
            ))}
          </div>

          <div className="flex flex-col items-center gap-3.5 text-center">
            <p className="font-cap text-[13px] uppercase tracking-[0.16em] text-gold-deep">
              Step {step + 1} of {steps.length}
            </p>
            <h1 className="font-serif text-[34px] font-medium leading-[1.08] text-fg-primary md:text-[46px]">
              {current.eyebrowQuestion}
            </h1>
            <p className="max-w-[580px] text-[17px] leading-relaxed text-fg-secondary">{current.support}</p>
          </div>

          {current.options ? (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              {current.options.map((o) => {
                const selected = value === o.label;
                return (
                  <button
                    key={o.label}
                    onClick={() => setValue(o.label)}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl border bg-card p-5.5 text-left transition-colors",
                      selected ? "border-2 border-ink" : "border border-border-subtle hover:border-border-strong",
                    )}
                  >
                    <span className={cn("flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-md", selected ? "bg-ink text-white" : "bg-surface-sunken text-ink")}>
                      <o.icon className="h-[21px] w-[21px]" />
                    </span>
                    <div className="flex-1">
                      <div className="text-[15px] font-semibold text-fg-primary">{o.label}</div>
                      <div className="text-[13px] text-fg-muted">{o.sub}</div>
                    </div>
                    <span className={cn("flex h-[26px] w-[26px] items-center justify-center rounded-full", selected ? "bg-ink" : "border-[1.5px] border-border-strong bg-card")}>
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={current.textarea?.placeholder}
              rows={3}
              className="w-full max-w-[640px] resize-none rounded-2xl border border-border-strong bg-card px-5 py-4 text-base text-fg-primary outline-none placeholder:text-fg-muted focus:border-ink"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={back} className="flex items-center gap-2 text-[15px] font-medium text-fg-secondary hover:text-fg-primary">
          <ArrowLeft className="h-[18px] w-[18px]" /> Back
        </button>
        <button
          onClick={next}
          disabled={!canContinue || saving}
          className="flex items-center gap-2 rounded-full bg-ink px-8 py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : step === steps.length - 1 ? "Finish" : "Continue"}{" "}
          <ArrowRight className="h-[17px] w-[17px]" />
        </button>
      </div>
    </div>
  );
};

export default PurposeOnboarding;
