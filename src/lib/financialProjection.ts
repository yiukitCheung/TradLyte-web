/**
 * Cash-flow projection for the Financial Health chart.
 *
 * Plots three cumulative lines over future months — gross income, total
 * outflow (expenses + any planned-purchase down payment + active loan
 * payments), and the savings between them. Goals and planned purchases are
 * marked on the savings line: a goal at its remaining amount (when the line
 * reaches it = funded), a purchase at its buy-month (where the line dips by the
 * down payment and then climbs more slowly because the loan payment kicks in).
 *
 * Pure + DOM-free for mobile parity. Reads nothing from storage.
 */

export interface GoalLike {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
}

/** A future house/car purchase the user is planning toward. Persisted in the vault. */
export interface PlannedPurchase {
  id: string;
  kind: "house" | "car";
  label: string;
  /** ISO date (we use the 1st of the chosen month). */
  targetDate: string;
  downPayment: number;
  /** Monthly loan payment that begins after the purchase. */
  monthlyPayment: number;
  /** Loan length in months — payment stops after this many months. */
  termMonths: number;
}

export interface GoalProjection {
  id: string;
  title: string;
  remaining: number;
  /** null = not fundable within the window (or no surplus); 0 = already funded. */
  monthsToFund: number | null;
  fundedDate: Date | null;
  alreadyFunded: boolean;
  onTrack: boolean | null;
}

export interface PurchaseMarker {
  id: string;
  kind: "house" | "car";
  label: string;
  monthIndex: number;
  /** Savings level right after the down payment is spent (dot position). */
  savingsAt: number;
  downPayment: number;
  /** True when savings just before the buy-month covered the down payment. */
  affordable: boolean;
  fundedDate: Date;
}

export interface ProjectionPoint {
  monthIndex: number;
  label: string;
  income: number;
  expense: number;
  savings: number;
}

export interface ProjectionSeries {
  points: ProjectionPoint[];
  goals: GoalProjection[];
  purchases: PurchaseMarker[];
  horizonMonths: number;
  /** True when base monthly income exceeds base monthly expenses. */
  fundable: boolean;
}

const MAX_HORIZON = 120; // cap projections at 10 years
const MIN_HORIZON = 12;

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthLabel(d: Date): string {
  return `${d.toLocaleString("en-US", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
}

/** Whole months from `now` until a target date, floored at 1 (a "buy now" lands next month). */
function monthsUntil(targetDate: string, now: Date): number {
  const t = new Date(targetDate);
  const diff = (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth());
  return Math.max(1, diff);
}

export interface ProjectionInput {
  monthlyIncome: number;
  monthlyExpense: number;
  goals: GoalLike[];
  purchases?: PlannedPurchase[];
  now?: Date;
}

export function buildProjectionSeries({
  monthlyIncome,
  monthlyExpense,
  goals,
  purchases = [],
  now = new Date(),
}: ProjectionInput): ProjectionSeries {
  const income = Number.isFinite(monthlyIncome) ? monthlyIncome : 0;
  const expense = Number.isFinite(monthlyExpense) ? monthlyExpense : 0;
  const baseSurplus = income - expense;
  const fundable = baseSurplus > 0;

  const buys = purchases.map((p) => ({ ...p, buyMonth: monthsUntil(p.targetDate, now) }));

  // Horizon: long enough to reach the slowest goal (accounting for the drag
  // purchases add) and to show the last purchase, within bounds.
  const remainingByGoal = goals.map((g) => Math.max(0, (g.target_amount || 0) - (g.current_amount || 0)));
  const slowestGoalMonths = fundable ? Math.max(0, ...remainingByGoal.map((r) => r / baseSurplus)) : 0;
  const totalDown = buys.reduce((s, b) => s + (b.downPayment || 0), 0);
  const dragMonths = fundable ? totalDown / baseSurplus : 0;
  const lastBuyMonth = buys.reduce((m, b) => Math.max(m, b.buyMonth), 0);
  const horizonMonths = Math.min(
    MAX_HORIZON,
    Math.max(MIN_HORIZON, Math.ceil(slowestGoalMonths + dragMonths), lastBuyMonth + 6) + 2,
  );

  // Walk the timeline accumulating income / expense (incl. down payments + active loan payments).
  const points: ProjectionPoint[] = [];
  let incomeCum = 0;
  let expenseCum = 0;
  const savingsBefore: number[] = []; // savings entering month m (used for affordability)
  for (let m = 0; m <= horizonMonths; m++) {
    savingsBefore[m] = incomeCum - expenseCum;
    if (m > 0) {
      incomeCum += income;
      let monthExpense = expense;
      for (const b of buys) {
        if (m === b.buyMonth) monthExpense += b.downPayment; // one-time outflow
        if (m > b.buyMonth && m <= b.buyMonth + b.termMonths) monthExpense += b.monthlyPayment;
      }
      expenseCum += monthExpense;
    }
    points.push({ monthIndex: m, label: monthLabel(addMonths(now, m)), income: incomeCum, expense: expenseCum, savings: incomeCum - expenseCum });
  }

  const savingsAt = (m: number) => points[Math.min(m, horizonMonths)]?.savings ?? 0;

  // Goals: first month the savings line reaches the goal's remaining amount.
  const goalProjections: GoalProjection[] = goals.map((g, i) => {
    const remaining = remainingByGoal[i];
    if (remaining <= 0) {
      return { id: g.id, title: g.title, remaining: 0, monthsToFund: 0, fundedDate: now, alreadyFunded: true, onTrack: true };
    }
    if (!fundable) {
      return { id: g.id, title: g.title, remaining, monthsToFund: null, fundedDate: null, alreadyFunded: false, onTrack: null };
    }
    const hitMonth = points.findIndex((p) => p.monthIndex > 0 && p.savings >= remaining);
    if (hitMonth < 0) {
      return { id: g.id, title: g.title, remaining, monthsToFund: null, fundedDate: null, alreadyFunded: false, onTrack: null };
    }
    const fundedDate = addMonths(now, hitMonth);
    const onTrack = g.target_date ? fundedDate <= new Date(g.target_date) : null;
    return { id: g.id, title: g.title, remaining, monthsToFund: hitMonth, fundedDate, alreadyFunded: false, onTrack };
  });

  const purchaseMarkers: PurchaseMarker[] = buys
    .filter((b) => b.buyMonth <= horizonMonths)
    .map((b) => ({
      id: b.id,
      kind: b.kind,
      label: b.label,
      monthIndex: b.buyMonth,
      savingsAt: savingsAt(b.buyMonth),
      downPayment: b.downPayment,
      affordable: savingsBefore[b.buyMonth] >= b.downPayment,
      fundedDate: addMonths(now, b.buyMonth),
    }));

  return { points, goals: goalProjections, purchases: purchaseMarkers, horizonMonths, fundable };
}

/** "Mar 2027" style date for funding/purchase lists. */
export function formatFundedDate(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}
