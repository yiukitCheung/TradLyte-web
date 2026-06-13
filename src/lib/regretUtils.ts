import { supabase } from "@/integrations/supabase/client";

export interface Regret {
  id: string;
  portfolioId: string | null;
  stockSymbol: string;
  date: string;
  reason: string;
  reasonCode: string | null;
  notes?: string;
  industry?: string;
}

export const REGRET_REASONS = [
  { value: "exited_early", label: "Exited too early" },
  { value: "not_aligned", label: "Didn't align with goals" },
  { value: "emotional", label: "Emotional decision" },
  { value: "other", label: "Other" },
] as const;

const REGRET_STORAGE_KEY = "tradlyte_regrets";

type LegacyRegret = {
  stockSymbol: string;
  date: string;
  reason: string;
  notes?: string;
  industry?: string;
};

type RegretRow = {
  id: string;
  portfolio_id: string | null;
  stock_symbol: string;
  industry: string | null;
  reason: string;
  reason_code: string | null;
  notes: string | null;
  trade_date: string | null;
  created_at: string | null;
};

function mapRow(row: RegretRow): Regret {
  return {
    id: row.id,
    portfolioId: row.portfolio_id,
    stockSymbol: row.stock_symbol,
    date: row.trade_date || row.created_at || new Date().toISOString(),
    reason: row.reason,
    reasonCode: row.reason_code,
    notes: row.notes ?? undefined,
    industry: row.industry ?? undefined,
  };
}

function getLocalRegrets(): LegacyRegret[] {
  try {
    const stored = localStorage.getItem(REGRET_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as LegacyRegret[];
  } catch {
    return [];
  }
}

/** One-time migration from browser storage to Supabase after sign-in. */
export async function migrateLocalRegrets(userId: string): Promise<void> {
  const local = getLocalRegrets();
  if (local.length === 0) return;

  const { data: existing } = await supabase
    .from("user_regrets")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existing && existing.length > 0) {
    localStorage.removeItem(REGRET_STORAGE_KEY);
    return;
  }

  for (const r of local) {
    await supabase.from("user_regrets").insert({
      user_id: userId,
      stock_symbol: r.stockSymbol.toUpperCase(),
      industry: r.industry ?? null,
      reason: r.reason,
      reason_code: null,
      notes: r.notes ?? null,
      trade_date: r.date,
    });
  }
  localStorage.removeItem(REGRET_STORAGE_KEY);
}

export async function fetchUserRegrets(userId: string): Promise<Regret[]> {
  await migrateLocalRegrets(userId);

  const { data, error } = await supabase
    .from("user_regrets")
    .select("id, portfolio_id, stock_symbol, industry, reason, reason_code, notes, trade_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch regrets:", error);
    return [];
  }
  return (data ?? []).map((row) => mapRow(row as RegretRow));
}

export async function addUserRegret(
  userId: string,
  input: {
    stockSymbol: string;
    reason: string;
    reasonCode?: string;
    notes?: string;
    industry?: string;
    portfolioId?: string | null;
  },
): Promise<Regret | null> {
  const symbol = input.stockSymbol.toUpperCase();

  const { data, error } = await supabase
    .from("user_regrets")
    .insert({
      user_id: userId,
      portfolio_id: input.portfolioId ?? null,
      stock_symbol: symbol,
      industry: input.industry ?? null,
      reason: input.reason,
      reason_code: input.reasonCode ?? null,
      notes: input.notes ?? null,
    })
    .select("id, portfolio_id, stock_symbol, industry, reason, reason_code, notes, trade_date, created_at")
    .single();

  if (error) {
    console.error("Failed to add regret:", error);
    throw error;
  }

  await supabase.from("behavior_logs").insert({
    user_id: userId,
    action_type: "regret_marked",
    action_data: {
      stock_symbol: symbol,
      reason: input.reason,
      reason_code: input.reasonCode ?? null,
      portfolio_id: input.portfolioId ?? null,
    },
  });

  return mapRow(data as RegretRow);
}

export async function removeUserRegret(userId: string, regretId: string): Promise<void> {
  const { error } = await supabase.from("user_regrets").delete().eq("id", regretId).eq("user_id", userId);
  if (error) throw error;
}

export function checkSimilarRegrets(
  stockSymbol: string,
  regrets: Regret[],
  industry?: string,
): Regret | null {
  const exactMatch = regrets.find((r) => r.stockSymbol.toUpperCase() === stockSymbol.toUpperCase());
  if (exactMatch) return exactMatch;

  if (industry) {
    const industryMatch = regrets.find(
      (r) => r.industry && r.industry.toLowerCase() === industry.toLowerCase(),
    );
    if (industryMatch) return industryMatch;
  }

  return null;
}

/** @deprecated Use fetchUserRegrets — kept for any legacy sync callers */
export const getRegrets = (): LegacyRegret[] => getLocalRegrets();

/** @deprecated Use addUserRegret */
export const addRegret = (regret: LegacyRegret): void => {
  try {
    const regrets = getLocalRegrets();
    regrets.push(regret);
    localStorage.setItem(REGRET_STORAGE_KEY, JSON.stringify(regrets));
  } catch (error) {
    console.error("Failed to add regret:", error);
  }
};

/** @deprecated Use removeUserRegret */
export const removeRegret = (stockSymbol: string, date: string): void => {
  try {
    const regrets = getLocalRegrets().filter(
      (r) => !(r.stockSymbol === stockSymbol && r.date === date),
    );
    localStorage.setItem(REGRET_STORAGE_KEY, JSON.stringify(regrets));
  } catch (error) {
    console.error("Failed to remove regret:", error);
  }
};

export function hasRegretForSymbol(regrets: Regret[], stockSymbol: string): boolean {
  return regrets.some((r) => r.stockSymbol.toUpperCase() === stockSymbol.toUpperCase());
}

export function hasRegretForPortfolio(regrets: Regret[], portfolioId: string): boolean {
  return regrets.some((r) => r.portfolioId === portfolioId);
}
