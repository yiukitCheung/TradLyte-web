export interface Milestone {
  id: string;
  title: string;
  financialTarget: number;
  completed: boolean;
  description: string;
  order: number;
}

export type GoalDisplayStatus = "on_track" | "behind" | "summit";

export interface UserGoalView {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: GoalDisplayStatus;
  progress: number;
  milestones: Milestone[];
}

interface StoredMilestone {
  id: string;
  title: string;
  financialTarget: number;
  description: string;
  order: number;
}

export function parseMilestonesFromDb(stored: unknown, currentAmount: number): Milestone[] {
  if (!Array.isArray(stored) || stored.length === 0) return [];
  return (stored as StoredMilestone[])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((m) => ({
      id: m.id,
      title: m.title,
      financialTarget: m.financialTarget ?? 0,
      description: m.description ?? "",
      order: m.order ?? 0,
      completed: currentAmount >= (m.financialTarget ?? 0),
    }));
}

export function pickSummitGoalId(
  goals: Array<{ id: string; target_date: string | null; target_amount: number }>,
): string | null {
  if (goals.length === 0) return null;
  const sorted = goals.slice().sort((a, b) => {
    const aDate = a.target_date ? new Date(a.target_date).getTime() : 0;
    const bDate = b.target_date ? new Date(b.target_date).getTime() : 0;
    if (bDate !== aDate) return bDate - aDate;
    return b.target_amount - a.target_amount;
  });
  return sorted[0]?.id ?? null;
}

export function isGoalBehindPace(progress: number, targetDate: string | null): boolean {
  if (progress >= 100) return false;
  if (!targetDate) return false;
  return new Date(targetDate) < new Date();
}

export function mapUserGoalRow(
  g: {
    id: string;
    title: string;
    description: string | null;
    target_amount: number | null;
    current_amount: number | null;
    target_date: string | null;
    status: string | null;
    milestones?: unknown;
  },
  summitGoalId: string | null,
): UserGoalView {
  const target = g.target_amount ? parseFloat(g.target_amount.toString()) : 0;
  const current = g.current_amount ? parseFloat(g.current_amount.toString()) : 0;
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const behind = g.status === "behind" || isGoalBehindPace(progress, g.target_date);

  let status: GoalDisplayStatus = "on_track";
  if (g.id === summitGoalId) status = "summit";
  else if (behind) status = "behind";

  return {
    id: g.id,
    title: g.title,
    description: g.description,
    target_amount: target,
    current_amount: current,
    target_date: g.target_date,
    status,
    progress,
    milestones: parseMilestonesFromDb(g.milestones, current),
  };
}

export function computeMonthlyContributions(
  goals: Array<{
    id: string;
    title: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
  }>,
): Array<{ goalId: string; goal: string; amount: number; pct: number }> {
  const items = goals.map((g) => {
    const remaining = Math.max(0, g.target_amount - g.current_amount);
    if (!g.target_date || remaining <= 0) {
      return { goalId: g.id, goal: g.title, amount: 0, pct: 0 };
    }
    const now = new Date();
    const target = new Date(g.target_date);
    const monthsLeft = Math.max(
      1,
      (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()),
    );
    const amount = Math.round(remaining / monthsLeft);
    return { goalId: g.id, goal: g.title, amount, pct: 0 };
  });
  const max = Math.max(...items.map((i) => i.amount), 1);
  return items.map((i) => ({ ...i, pct: (i.amount / max) * 100 }));
}

export interface ParsedAiGoal {
  title: string;
  target_amount: number;
  target_date: string | null;
  why: string | null;
}

/**
 * Parse an AI goal-planner response into a validated goal draft. The model is
 * asked for bare JSON but may wrap it in prose or a ```json fence, so we extract
 * the first balanced object and validate every field. Returns null on anything
 * we can't trust — the caller falls back to the manual dialog.
 */
export function parseAiGoal(raw: string): ParsedAiGoal | null {
  if (!raw || typeof raw !== "string") return null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }

  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  if (!title) return null;

  const amountRaw = obj.target_amount;
  const amount = typeof amountRaw === "number" ? amountRaw : Number(String(amountRaw ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let target_date: string | null = null;
  if (typeof obj.target_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.target_date.trim())) {
    const d = new Date(`${obj.target_date.trim()}T12:00:00`);
    if (!Number.isNaN(d.getTime())) target_date = obj.target_date.trim();
  }

  const why = typeof obj.why === "string" && obj.why.trim() ? obj.why.trim() : null;

  return { title, target_amount: Math.round(amount), target_date, why };
}

export const generateMilestones = (goalTitle: string, targetAmount: number): Milestone[] => {
  const goalLower = goalTitle.toLowerCase();
  const milestones: Milestone[] = [];
  let order = 1;

  // Emergency Fund Goal
  if (goalLower.includes('emergency') || goalLower.includes('fund')) {
    milestones.push({
      id: `${order}-1`,
      title: 'Build $1,000 Starter Fund',
      financialTarget: 1000,
      completed: false,
      description: 'Start with a small emergency fund',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Reach $5,000 Milestone',
      financialTarget: 5000,
      completed: false,
      description: 'Build a solid foundation',
      order: order++
    });
    if (targetAmount > 10000) {
      milestones.push({
        id: `${order}-1`,
        title: 'Complete Emergency Fund',
        financialTarget: targetAmount,
        completed: false,
        description: 'Full 6-month expense coverage',
        order: order++
      });
    }
  }
  // Home Purchase Goal
  else if (goalLower.includes('home') || goalLower.includes('house') || goalLower.includes('property')) {
    milestones.push({
      id: `${order}-1`,
      title: 'Build Emergency Fund First',
      financialTarget: 10000,
      completed: false,
      description: 'Save 6 months of expenses before home purchase',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Save 10% of Down Payment',
      financialTarget: targetAmount * 0.1,
      completed: false,
      description: 'First milestone toward down payment',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Reach 50% of Down Payment',
      financialTarget: targetAmount * 0.5,
      completed: false,
      description: 'Halfway to your down payment goal',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Complete Down Payment',
      financialTarget: targetAmount,
      completed: false,
      description: 'Full down payment saved',
      order: order++
    });
  }
  // Retirement Goal
  else if (goalLower.includes('retirement') || goalLower.includes('retire')) {
    milestones.push({
      id: `${order}-1`,
      title: 'First $10,000 Saved',
      financialTarget: 10000,
      completed: false,
      description: 'Start your retirement journey',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Reach $50,000 Milestone',
      financialTarget: 50000,
      completed: false,
      description: 'Building momentum',
      order: order++
    });
    if (targetAmount > 100000) {
      milestones.push({
        id: `${order}-1`,
        title: 'Reach $100,000 Milestone',
        financialTarget: 100000,
        completed: false,
        description: 'Significant progress',
        order: order++
      });
    }
    milestones.push({
      id: `${order}-1`,
      title: 'Quarter Way to Goal',
      financialTarget: targetAmount * 0.25,
      completed: false,
      description: '25% of retirement goal',
      order: order++
    });
  }
  // Investment/Portfolio Goal
  else if (goalLower.includes('investment') || goalLower.includes('portfolio') || goalLower.includes('invest')) {
    milestones.push({
      id: `${order}-1`,
      title: 'First $5,000 Invested',
      financialTarget: 5000,
      completed: false,
      description: 'Start your investment journey',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Reach $25,000 Milestone',
      financialTarget: 25000,
      completed: false,
      description: 'Building your portfolio',
      order: order++
    });
    if (targetAmount > 50000) {
      milestones.push({
        id: `${order}-1`,
        title: 'Halfway to Goal',
        financialTarget: targetAmount * 0.5,
        completed: false,
        description: '50% of investment goal',
        order: order++
      });
    }
  }
  // Travel Goal
  else if (goalLower.includes('travel') || goalLower.includes('trip') || goalLower.includes('vacation')) {
    milestones.push({
      id: `${order}-1`,
      title: 'Save 25% of Trip Cost',
      financialTarget: targetAmount * 0.25,
      completed: false,
      description: 'First quarter saved',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Reach Halfway Point',
      financialTarget: targetAmount * 0.5,
      completed: false,
      description: '50% of travel fund',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Complete Travel Fund',
      financialTarget: targetAmount,
      completed: false,
      description: 'Ready for your adventure',
      order: order++
    });
  }
  // Business/Startup Goal
  else if (goalLower.includes('business') || goalLower.includes('startup') || goalLower.includes('company')) {
    milestones.push({
      id: `${order}-1`,
      title: 'Initial Capital: $5,000',
      financialTarget: 5000,
      completed: false,
      description: 'Startup capital milestone',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Reach 25% of Goal',
      financialTarget: targetAmount * 0.25,
      completed: false,
      description: 'Quarter way to business funding',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Halfway to Funding',
      financialTarget: targetAmount * 0.5,
      completed: false,
      description: '50% of business capital',
      order: order++
    });
  }
  // Default: Generic milestones
  else {
    const quarter = targetAmount * 0.25;
    const half = targetAmount * 0.5;
    const threeQuarter = targetAmount * 0.75;

    if (targetAmount > 10000) {
      milestones.push({
        id: `${order}-1`,
        title: 'First $5,000',
        financialTarget: 5000,
        completed: false,
        description: 'Initial milestone',
        order: order++
      });
    }
    milestones.push({
      id: `${order}-1`,
      title: '25% Complete',
      financialTarget: quarter,
      completed: false,
      description: 'Quarter way to goal',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: 'Halfway There',
      financialTarget: half,
      completed: false,
      description: '50% of goal achieved',
      order: order++
    });
    milestones.push({
      id: `${order}-1`,
      title: '75% Complete',
      financialTarget: threeQuarter,
      completed: false,
      description: 'Almost there',
      order: order++
    });
  }

  // Always add final goal milestone
  milestones.push({
    id: `${order}-1`,
    title: 'Goal Achieved!',
    financialTarget: targetAmount,
    completed: false,
    description: 'Congratulations! You reached your goal',
    order: order++
  });

  return milestones;
};
