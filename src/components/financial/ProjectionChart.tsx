import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from "recharts";
import { Target, TrendingDown, CheckCircle2, Home, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildProjectionSeries,
  formatFundedDate,
  type GoalLike,
  type PlannedPurchase,
} from "@/lib/financialProjection";

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * Three-line cash-flow projection: cumulative income, expenses, and the savings
 * between them. Goals are marked on the savings line at their remaining amount;
 * planned purchases dip it at their buy-month. Honest by design — no surplus,
 * no line.
 */
export default function ProjectionChart({
  monthlyIncome,
  monthlyExpense,
  goals,
  purchases = [],
  showFundingList = true,
}: {
  monthlyIncome: number;
  monthlyExpense: number;
  goals: GoalLike[];
  purchases?: PlannedPurchase[];
  /** Show the per-goal/purchase list under the chart. Off on Goals (it has its own pace section). */
  showFundingList?: boolean;
}) {
  const series = useMemo(
    () => buildProjectionSeries({ monthlyIncome, monthlyExpense, goals, purchases }),
    [monthlyIncome, monthlyExpense, goals, purchases],
  );

  const surplus = monthlyIncome - monthlyExpense;
  const hasGoals = goals.length > 0;
  const hasPurchases = series.purchases.length > 0;

  if (!series.fundable) {
    return (
      <div className="rounded-2xl border border-border-subtle bg-card p-6">
        <Header hasGoals={hasGoals} />
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-negative/30 bg-negative-soft p-4">
          <TrendingDown className="mt-0.5 h-5 w-5 shrink-0 text-negative" />
          <p className="text-sm text-fg-secondary">
            {hasGoals
              ? "With expenses above income, there's no surplus to project yet. Free up some room and you'll see exactly when each goal lands."
              : "Once your income covers your expenses, your surplus grows here month over month."}
          </p>
        </div>
      </div>
    );
  }

  const fundingGoals = series.goals
    .slice()
    .sort((a, b) => (a.monthsToFund ?? Infinity) - (b.monthsToFund ?? Infinity));
  const goalMarkers = series.goals.filter(
    (g) => !g.alreadyFunded && g.monthsToFund != null && g.monthsToFund <= series.horizonMonths,
  );

  const showList = showFundingList && (hasGoals || hasPurchases);

  return (
    <div className="rounded-2xl border border-border-subtle bg-card p-6">
      <Header surplus={surplus} hasGoals={hasGoals} />

      <div className="mt-4 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.points} margin={{ top: 14, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="label"
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              width={48}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border-subtle))",
                borderRadius: "12px",
                fontSize: 12,
              }}
              formatter={(v: number, name: string) => [money(v), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
            <Line type="monotone" dataKey="income" name="Income" stroke="hsl(var(--positive))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" name="Expenses" stroke="hsl(var(--negative))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="savings" name="Savings" stroke="hsl(var(--accent-ink))" strokeWidth={2.75} dot={false} activeDot={{ r: 5 }} />
            {goalMarkers.map((g) => (
              <ReferenceDot
                key={g.id}
                x={series.points[g.monthsToFund as number]?.label}
                y={g.remaining}
                r={5}
                fill="hsl(var(--accent-deep))"
                stroke="hsl(var(--card))"
                strokeWidth={2}
                label={{ value: g.title, position: "top", fill: "hsl(var(--accent-deep))", fontSize: 11 }}
              />
            ))}
            {series.purchases.map((p) => (
              <ReferenceDot
                key={p.id}
                x={series.points[p.monthIndex]?.label}
                y={p.savingsAt}
                r={5}
                fill={p.affordable ? "hsl(var(--accent-deep))" : "hsl(var(--negative))"}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                label={{
                  value: `${p.kind === "house" ? "🏠" : "🚗"} ${p.label}`,
                  position: "bottom",
                  fill: p.affordable ? "hsl(var(--fg-secondary))" : "hsl(var(--negative))",
                  fontSize: 11,
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!hasGoals && !hasPurchases && (
        <p className="mt-4 border-t border-border-subtle pt-4 text-sm text-fg-muted">
          You're saving <strong className="text-fg-secondary">{money(surplus)}/mo</strong>. Set a goal, or plan a purchase
          below, and we'll mark on this line exactly when it lands.
        </p>
      )}

      {showList && (
        <ul className="mt-4 space-y-2 border-t border-border-subtle pt-4">
          {fundingGoals.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-fg-secondary">
                {g.alreadyFunded ? (
                  <CheckCircle2 className="h-4 w-4 text-positive" />
                ) : (
                  <Target className="h-4 w-4 text-gold-deep" />
                )}
                {g.title}
              </span>
              {g.alreadyFunded ? (
                <span className="font-cap text-xs text-positive">Funded</span>
              ) : g.fundedDate ? (
                <span className="flex items-center gap-2 text-right">
                  <span className="font-medium text-fg-primary">{formatFundedDate(g.fundedDate)}</span>
                  <span className="font-cap text-[11px] text-fg-muted">
                    {g.monthsToFund} {g.monthsToFund === 1 ? "mo" : "mos"}
                  </span>
                  {g.onTrack != null && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-cap text-[10px] uppercase tracking-wide",
                        g.onTrack ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
                      )}
                    >
                      {g.onTrack ? "On track" : "Behind"}
                    </span>
                  )}
                </span>
              ) : (
                <span className="font-cap text-xs text-fg-muted">Beyond this window</span>
              )}
            </li>
          ))}
          {series.purchases.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-fg-secondary">
                {p.kind === "house" ? <Home className="h-4 w-4 text-gold-deep" /> : <Car className="h-4 w-4 text-gold-deep" />}
                {p.label}
              </span>
              <span className="flex items-center gap-2 text-right">
                <span className="font-medium text-fg-primary">{formatFundedDate(p.fundedDate)}</span>
                <span className="font-cap text-[11px] text-fg-muted">{money(p.downPayment)} down</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 font-cap text-[10px] uppercase tracking-wide",
                    p.affordable ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative",
                  )}
                >
                  {p.affordable ? "Affordable" : "Short"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Header({ surplus, hasGoals }: { surplus?: number; hasGoals?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-cap text-[11px] uppercase tracking-[0.14em] text-fg-muted">Cash-flow projection</p>
        <h3 className="mt-1 font-serif text-xl font-medium text-fg-primary">
          {hasGoals ? "Income, expenses & when your saving funds your goals" : "Income, expenses & your growing surplus"}
        </h3>
      </div>
      {surplus != null && (
        <span className="shrink-0 rounded-full bg-positive-soft px-3 py-1 font-cap text-xs font-medium text-positive">
          {money(surplus)}/mo
        </span>
      )}
    </div>
  );
}
