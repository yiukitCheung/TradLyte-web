/** Financial Health domain model + encrypted persistence (cash-flow core, v1). */
import { supabase } from "@/integrations/supabase/client";
import {
  createVaultKeys,
  decryptState,
  encryptState,
  rewrapForPassword,
  unlockWithPassword,
  unlockWithRecoveryCode,
  type VaultCryptoFields,
} from "@/lib/financialVault";

import type { PlannedPurchase } from "@/lib/financialProjection";
export type { PlannedPurchase };

export type Frequency = "weekly" | "biweekly" | "monthly" | "annual";

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Transport",
  "Food",
  "Utilities",
  "Insurance",
  "Debt",
  "Healthcare",
  "Discretionary",
  "Savings",
  "Other",
] as const;

export interface IncomeItem {
  id: string;
  label: string;
  amount: number;
  frequency: Frequency;
}

export interface ExpenseItem {
  id: string;
  /** Optional free-text note. Not surfaced in the web UI (the category names the
   * row) but kept in the model for back-compat and mobile-app parity. */
  label?: string;
  category: string;
  amount: number;
  frequency: Frequency;
  /** Fixed/recurring obligation (mortgage, car loan, etc.) vs. variable spend. */
  fixed: boolean;
}

export interface FinancialState {
  income: IncomeItem[];
  expenses: ExpenseItem[];
  /** Planned future house/car purchases (simulated on the projection chart). */
  purchases?: PlannedPurchase[];
  meta: { currency: string; updatedAt: string };
}

export const emptyState = (): FinancialState => ({
  income: [],
  expenses: [],
  purchases: [],
  meta: { currency: "USD", updatedAt: new Date().toISOString() },
});

export const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Normalize any cadence to a monthly figure. */
export function toMonthly(amount: number, frequency: Frequency): number {
  if (!Number.isFinite(amount)) return 0;
  switch (frequency) {
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "annual":
      return amount / 12;
    default:
      return amount;
  }
}

export interface CashFlowSummary {
  monthlyIncome: number;
  monthlyExpense: number;
  surplus: number;
  /** Surplus as a share of income, 0–1. 0 when income is 0. */
  savingsRate: number;
  byCategory: { category: string; amount: number }[];
}

export function computeSummary(state: FinancialState): CashFlowSummary {
  const monthlyIncome = state.income.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyExpense = state.expenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
  const surplus = monthlyIncome - monthlyExpense;

  const catMap = new Map<string, number>();
  for (const e of state.expenses) {
    const m = toMonthly(e.amount, e.frequency);
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + m);
  }
  const byCategory = [...catMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    monthlyIncome,
    monthlyExpense,
    surplus,
    savingsRate: monthlyIncome > 0 ? surplus / monthlyIncome : 0,
    byCategory,
  };
}

// ---- Persistence (ciphertext only) -----------------------------------------

const TABLE = "user_financial_vault";

export interface VaultRow extends VaultCryptoFields {
  user_id: string;
  ciphertext: string | null;
  ciphertext_iv: string | null;
  version: number;
}

export async function fetchVaultRow(userId: string): Promise<VaultRow | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "user_id, kdf_salt_pw, kdf_salt_rc, wrapped_dek_pw, wrapped_dek_pw_iv, wrapped_dek_rc, wrapped_dek_rc_iv, ciphertext, ciphertext_iv, version",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as VaultRow) ?? null;
}

/** Create the vault row, encrypt the initial state, return the recovery code + DEK. */
export async function createVault(
  userId: string,
  password: string,
  initial: FinancialState = emptyState(),
): Promise<{ recoveryCode: string; dek: CryptoKey }> {
  const { fields, recoveryCode, dek } = await createVaultKeys(password);
  const blob = await encryptState(dek, initial);
  const { error } = await supabase.from(TABLE).insert({ user_id: userId, ...fields, ...blob, version: 1 });
  if (error) throw error;
  return { recoveryCode, dek };
}

export async function unlockWithPasswordRow(password: string, row: VaultRow): Promise<CryptoKey> {
  return unlockWithPassword(password, row);
}

export async function unlockWithRecoveryRow(code: string, row: VaultRow): Promise<CryptoKey> {
  return unlockWithRecoveryCode(code, row);
}

export async function decryptRow(dek: CryptoKey, row: VaultRow): Promise<FinancialState> {
  if (!row.ciphertext || !row.ciphertext_iv) return emptyState();
  return decryptState<FinancialState>(dek, row.ciphertext, row.ciphertext_iv);
}

export async function saveState(userId: string, dek: CryptoKey, state: FinancialState): Promise<FinancialState> {
  const next: FinancialState = { ...state, meta: { ...state.meta, updatedAt: new Date().toISOString() } };
  const blob = await encryptState(dek, next);
  const { error } = await supabase.from(TABLE).update(blob).eq("user_id", userId);
  if (error) throw error;
  return next;
}

/** Re-wrap the DEK under the current login password so seamless unlock works
 * again after a recovery-code unlock or a password change. Best-effort. */
export async function rewrapPasswordWrap(userId: string, dek: CryptoKey, password: string): Promise<void> {
  const fields = await rewrapForPassword(dek, password);
  const { error } = await supabase.from(TABLE).update(fields).eq("user_id", userId);
  if (error) throw error;
}
