/** Client for the `admin-api` edge function (admin dashboard + user management). */
import { supabase } from "@/integrations/supabase/client";

/** Email allow-list the admin UI gates on client-side (UX only; the edge
 * function is the real boundary). Keep in sync with the function's ADMIN_EMAILS. */
export const ADMIN_EMAILS = ["admin@tradlyte.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  onboardingComplete: boolean;
  isPro: boolean;
  strategyCount: number;
  goalCount: number;
  journalCount: number;
  portfolioCount: number;
  regretCount: number;
}

export interface AdminActivityRow {
  id: string;
  userId: string;
  email: string | null;
  actionType: string;
  actionData: unknown;
  createdAt: string;
}

export interface AdminOverview {
  totals: {
    users: number;
    strategies: number;
    goals: number;
    journalEntries: number;
    portfolioHoldings: number;
    regrets: number;
    activityEvents: number;
  };
  newUsers: { today: number; last7Days: number; last30Days: number };
  signupTrend: Array<{ date: string; count: number }>;
  users: AdminUserRow[];
  recentActivity: AdminActivityRow[];
}

async function invoke<T>(action: string, payload?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-api", {
    body: { action, payload },
  });
  if (error) {
    // Edge function returns JSON errors with a useful message in the body.
    const ctx = "context" in error ? ((error as { context?: unknown }).context as Response | undefined) : undefined;
    let msg = error.message;
    if (ctx) {
      try {
        const j = (await ctx.clone().json()) as { error?: string; detail?: string };
        msg = j.error || j.detail || msg;
      } catch {
        /* keep default */
      }
    }
    throw new Error(msg || "Admin request failed");
  }
  return data as T;
}

export const fetchAdminOverview = () => invoke<AdminOverview>("overview");

export const createAdminUser = (input: { email: string; password: string; fullName?: string }) =>
  invoke<{ ok: true; userId?: string }>("createUser", input);

export const deleteAdminUser = (userId: string) =>
  invoke<{ ok: true }>("deleteUser", { userId });

/** Mark a user's phone confirmed (no SMS) so they skip the mobile phone gate. */
export const verifyAdminUserPhone = (input: { userId: string; phone: string }) =>
  invoke<{ ok: true; phoneConfirmedAt: string | null }>("verifyPhone", input);

/** Toggle a user's pro tier. */
export const setAdminUserPro = (input: { userId: string; isPro: boolean }) =>
  invoke<{ ok: true; isPro: boolean }>("setPro", input);
