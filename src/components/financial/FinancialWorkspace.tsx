import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFinancialVault } from "@/hooks/useFinancialVault";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  computeSummary,
  emptyState,
  newId,
  EXPENSE_CATEGORIES,
  FREQUENCIES,
  type ExpenseItem,
  type FinancialState,
  type Frequency,
  type IncomeItem,
} from "@/lib/financialData";
import type { GoalLike } from "@/lib/financialProjection";
import { Plus, Trash2, Loader2, Check, TrendingUp, TrendingDown, Lock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ProjectionChart from "./ProjectionChart";
import LoanCalculators from "./LoanCalculators";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const CATEGORY_COLORS = [
  "hsl(var(--accent-deep))",
  "hsl(var(--accent))",
  "hsl(var(--positive))",
  "hsl(var(--negative))",
  "hsl(var(--accent-tertiary))",
  "hsl(var(--fg-muted))",
];

const inputCls =
  "rounded-md border border-border-strong bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function FreqSelect({ value, onChange }: { value: Frequency; onChange: (f: Frequency) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Frequency)} className={inputCls}>
      {FREQUENCIES.map((f) => (
        <option key={f.value} value={f.value}>
          {f.label}
        </option>
      ))}
    </select>
  );
}

export default function FinancialWorkspace() {
  const { state, save, lock } = useFinancialVault();
  const { user } = useAuth();
  const [draft, setDraft] = useState<FinancialState>(() => state ?? emptyState());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Read-only goal data feeds the savings projection. RLS scopes it to the user.
  const { data: goals = [] } = useQuery<GoalLike[]>({
    queryKey: ["financial-goals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_goals")
        .select("id, title, target_amount, current_amount, target_date")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((g) => ({
        id: g.id,
        title: g.title,
        target_amount: g.target_amount ? parseFloat(g.target_amount.toString()) : 0,
        current_amount: g.current_amount ? parseFloat(g.current_amount.toString()) : 0,
        target_date: g.target_date,
      }));
    },
  });

  // Debounced autosave whenever the draft changes.
  useEffect(() => {
    if (!dirty) return;
    const id = setTimeout(async () => {
      setSaving(true);
      try {
        await save(draft);
        setDirty(false);
      } catch {
        toast.error("Couldn't save your changes — they're still on screen, try again.");
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => clearTimeout(id);
  }, [dirty, draft, save]);

  const summary = useMemo(() => computeSummary(draft), [draft]);

  const mutate = (fn: (prev: FinancialState) => FinancialState) => {
    setDraft((prev) => fn(prev));
    setDirty(true);
  };

  const addIncome = () =>
    mutate((p) => ({ ...p, income: [...p.income, { id: newId(), label: "", amount: 0, frequency: "monthly" }] }));
  const updateIncome = (id: string, patch: Partial<IncomeItem>) =>
    mutate((p) => ({ ...p, income: p.income.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeIncome = (id: string) => mutate((p) => ({ ...p, income: p.income.filter((i) => i.id !== id) }));

  const addExpense = (prefill?: Partial<ExpenseItem>) =>
    mutate((p) => ({
      ...p,
      expenses: [...p.expenses, { id: newId(), category: "Housing", amount: 0, frequency: "monthly", fixed: true, ...prefill }],
    }));
  const updateExpense = (id: string, patch: Partial<ExpenseItem>) =>
    mutate((p) => ({ ...p, expenses: p.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const removeExpense = (id: string) => mutate((p) => ({ ...p, expenses: p.expenses.filter((e) => e.id !== id) }));

  const positive = summary.surplus >= 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Save status + lock */}
      <div className="flex items-center justify-between">
        <span className="font-cap text-xs text-fg-muted">
          {saving ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </span>
          ) : dirty ? (
            "Unsaved changes…"
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-positive" /> Encrypted &amp; saved
            </span>
          )}
        </span>
        <button
          onClick={lock}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-card px-3 py-1.5 font-cap text-xs font-medium text-fg-secondary hover:bg-surface-sunken"
        >
          <Lock className="h-3.5 w-3.5" /> Lock
        </button>
      </div>

      {/* Summary band */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1fr_1.2fr]">
        <SummaryStat label="Monthly income" value={money(summary.monthlyIncome)} />
        <SummaryStat label="Monthly expenses" value={money(summary.monthlyExpense)} />
        <div className={cn("rounded-2xl border p-5", positive ? "border-positive/40 bg-positive-soft" : "border-negative/40 bg-negative-soft")}>
          <div className={cn("flex items-center gap-2 font-cap text-[11px] uppercase tracking-[0.14em]", positive ? "text-positive" : "text-negative")}>
            {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {positive ? "Monthly surplus" : "Monthly shortfall"}
          </div>
          <div className={cn("mt-2 font-serif text-3xl font-medium", positive ? "text-positive" : "text-negative")}>
            {money(Math.abs(summary.surplus))}
          </div>
          <div className="mt-1 text-sm text-fg-secondary">Savings rate {(summary.savingsRate * 100).toFixed(0)}%</div>
        </div>
        {/* Breakdown */}
        <div className="rounded-2xl border border-border-subtle bg-card p-5">
          <p className="font-cap text-[11px] uppercase tracking-[0.14em] text-fg-muted">Where it goes</p>
          {summary.byCategory.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">Add expenses to see a breakdown.</p>
          ) : (
            <div className="mt-1 flex items-center gap-3">
              <div className="h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.byCategory} dataKey="amount" nameKey="category" innerRadius={26} outerRadius={44} paddingAngle={2}>
                      {summary.byCategory.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid hsl(var(--border-subtle))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1 text-xs">
                {summary.byCategory.slice(0, 5).map((c, i) => (
                  <li key={c.category} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-fg-secondary">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      {c.category}
                    </span>
                    <span className="font-medium text-fg-primary">{money(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Cash-flow projection → goal funding + planned purchases */}
      <ProjectionChart
        monthlyIncome={summary.monthlyIncome}
        monthlyExpense={summary.monthlyExpense}
        goals={goals}
        purchases={draft.purchases ?? []}
      />

      {/* Income */}
      <Section
        title="Income"
        subtitle="What comes in, at whatever cadence — we normalize to monthly."
        onAdd={addIncome}
        addLabel="Add income"
        empty={draft.income.length === 0}
        emptyText="No income added yet."
      >
        {draft.income.map((i) => (
          <div key={i.id} className="grid grid-cols-[1fr_120px_130px_36px] items-center gap-2.5">
            <input className={inputCls} placeholder="e.g. Salary" value={i.label} onChange={(e) => updateIncome(i.id, { label: e.target.value })} />
            <input className={inputCls} type="number" min="0" placeholder="0" value={i.amount || ""} onChange={(e) => updateIncome(i.id, { amount: parseFloat(e.target.value) || 0 })} />
            <FreqSelect value={i.frequency} onChange={(f) => updateIncome(i.id, { frequency: f })} />
            <RemoveBtn onClick={() => removeIncome(i.id)} />
          </div>
        ))}
      </Section>

      {/* Expenses */}
      <Section
        title="Expenses"
        subtitle="Fixed obligations (rent, mortgage, car) and everyday spending — grouped by type."
        onAdd={() => addExpense()}
        addLabel="Add expense"
        empty={draft.expenses.length === 0}
        emptyText="No expenses added yet."
      >
        {draft.expenses.map((e) => (
          <div key={e.id} className="grid grid-cols-[1.4fr_130px_120px_auto_36px] items-center gap-2.5">
            <select className={inputCls} value={e.category} onChange={(ev) => updateExpense(e.id, { category: ev.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input className={inputCls} type="number" min="0" placeholder="0" value={e.amount || ""} onChange={(ev) => updateExpense(e.id, { amount: parseFloat(ev.target.value) || 0 })} />
            <FreqSelect value={e.frequency} onChange={(f) => updateExpense(e.id, { frequency: f })} />
            <label className="flex items-center gap-1.5 font-cap text-[11px] text-fg-muted">
              <input type="checkbox" checked={e.fixed} onChange={(ev) => updateExpense(e.id, { fixed: ev.target.checked })} className="h-3.5 w-3.5 accent-[hsl(var(--accent-deep))]" />
              Fixed
            </label>
            <RemoveBtn onClick={() => removeExpense(e.id)} />
          </div>
        ))}
      </Section>

      {/* Plan big purchases → simulated on the projection chart */}
      <LoanCalculators
        purchases={draft.purchases ?? []}
        onAddPurchase={(p) => mutate((s) => ({ ...s, purchases: [...(s.purchases ?? []), p] }))}
        onRemovePurchase={(id) => mutate((s) => ({ ...s, purchases: (s.purchases ?? []).filter((x) => x.id !== id) }))}
      />

      <p className="font-cap text-[11px] leading-relaxed text-fg-muted">
        Encrypted on your device before saving · we store only ciphertext · for personal planning, not financial advice.
      </p>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-card p-5">
      <p className="font-cap text-[11px] uppercase tracking-[0.14em] text-fg-muted">{label}</p>
      <div className="mt-2 font-serif text-3xl font-medium text-fg-primary">{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  onAdd,
  addLabel,
  empty,
  emptyText,
  children,
}: {
  title: string;
  subtitle: string;
  onAdd: () => void;
  addLabel: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl font-medium text-fg-primary">{title}</h3>
          <p className="mt-1 text-sm text-fg-secondary">{subtitle}</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 overflow-x-auto">
        {empty ? <p className="py-2 font-cap text-sm text-fg-muted">{emptyText}</p> : children}
      </div>
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove row"
      className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-negative-soft hover:text-negative"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
