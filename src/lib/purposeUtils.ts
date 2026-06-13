import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface UserPurpose {
  primaryGoal: string;
  purposeStatement: string;
  onboardingComplete: boolean;
  supabaseUserId?: string;
}

export interface ProfilePurposeRow {
  onboarding_complete: boolean;
  primary_goal: string | null;
  purpose_statement: string | null;
  investment_experience: string | null;
  time_horizon: string | null;
  risk_tolerance: string | null;
}

const PURPOSE_STORAGE_KEY = "tradlyte_purpose";
const QUOTE_STORAGE_KEY = "tradlyte_quote_index";
const LAST_QUOTE_DATE_KEY = "tradlyte_last_quote_date";

const PROFILE_PURPOSE_COLUMNS =
  "onboarding_complete, primary_goal, purpose_statement, investment_experience, time_horizon, risk_tolerance" as const;

export const getUserPurpose = (): UserPurpose | null => {
  try {
    const stored = localStorage.getItem(PURPOSE_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as UserPurpose;
  } catch {
    return null;
  }
};

export const saveUserPurpose = (purpose: UserPurpose): void => {
  try {
    localStorage.setItem(PURPOSE_STORAGE_KEY, JSON.stringify(purpose));
  } catch (error) {
    console.error("Failed to save user purpose:", error);
  }
};

export const isOnboardingComplete = (): boolean => {
  const purpose = getUserPurpose();
  return purpose?.onboardingComplete ?? false;
};

export const isOnboardingCompleteFromMetadata = (user: User | null | undefined): boolean => {
  if (!user?.user_metadata) return false;
  const v = user.user_metadata.onboarding_complete;
  return v === true || v === "true";
};

const purposeMatchesUser = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const purpose = getUserPurpose();
  if (!purpose?.onboardingComplete) return false;
  if (purpose.supabaseUserId) return purpose.supabaseUserId === user.id;
  return true;
};

/** Sync check — prefer Supabase-backed resolution via resolveOnboardingComplete in guards. */
export const isOnboardingCompleteForUser = (user: User | null | undefined): boolean => {
  return isOnboardingCompleteFromMetadata(user) || purposeMatchesUser(user);
};

function syncLocalFromProfile(userId: string, profile: ProfilePurposeRow): void {
  saveUserPurpose({
    primaryGoal: profile.primary_goal ?? "",
    purposeStatement: profile.purpose_statement ?? "",
    onboardingComplete: profile.onboarding_complete,
    supabaseUserId: userId,
  });
}

export async function fetchProfilePurpose(userId: string): Promise<ProfilePurposeRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_PURPOSE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Could not load profile purpose:", error.message);
    return null;
  }
  return data as ProfilePurposeRow | null;
}

async function userHasEstablishedActivity(userId: string): Promise<boolean> {
  const [journal, goals, portfolio] = await Promise.all([
    supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("user_goals").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("user_portfolio").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  return (
    (journal.count ?? 0) > 0 ||
    (goals.count ?? 0) > 0 ||
    (portfolio.count ?? 0) > 0
  );
}

export async function saveOnboardingToProfile(
  user: User,
  input: {
    primaryGoal: string;
    purposeStatement: string;
    investmentExperience?: string | null;
    timeHorizon?: string | null;
    riskTolerance?: string | null;
    firstGoalTitle?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const purpose: UserPurpose = {
    primaryGoal: input.primaryGoal,
    purposeStatement: input.purposeStatement,
    onboardingComplete: true,
    supabaseUserId: user.id,
  };
  saveUserPurpose(purpose);

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
      primary_goal: input.primaryGoal || null,
      purpose_statement: input.purposeStatement.trim() || null,
      investment_experience: input.investmentExperience ?? null,
      time_horizon: input.timeHorizon ?? null,
      risk_tolerance: input.riskTolerance ?? null,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  if (input.firstGoalTitle?.trim()) {
    const { error: goalError } = await supabase.from("user_goals").insert({
      user_id: user.id,
      title: input.firstGoalTitle.trim(),
      current_amount: 0,
      status: "active",
    });
    if (goalError) console.warn("Could not create first goal from onboarding:", goalError.message);
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { onboarding_complete: true },
  });
  if (metaError) console.warn("Could not mirror onboarding flag in user metadata:", metaError.message);

  return { ok: true };
}

/** Source of truth: Supabase profile, then metadata/local cache, then activity backfill for existing users. */
export async function resolveOnboardingComplete(user: User | null | undefined): Promise<boolean> {
  if (!user) return false;

  const profile = await fetchProfilePurpose(user.id);
  if (profile?.onboarding_complete) {
    syncLocalFromProfile(user.id, profile);
    return true;
  }

  if (isOnboardingCompleteFromMetadata(user)) {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, onboarding_complete: true }, { onConflict: "id" });
    return true;
  }

  if (purposeMatchesUser(user)) {
    const local = getUserPurpose();
    if (local) {
      await saveOnboardingToProfile(user, {
        primaryGoal: local.primaryGoal,
        purposeStatement: local.purposeStatement,
      });
    }
    return true;
  }

  if (await userHasEstablishedActivity(user.id)) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    saveUserPurpose({
      primaryGoal: profile?.primary_goal ?? "",
      purposeStatement: profile?.purpose_statement ?? "",
      onboardingComplete: true,
      supabaseUserId: user.id,
    });
    await supabase.auth.updateUser({ data: { onboarding_complete: true } });
    return true;
  }

  return false;
}

export function mapExperienceLabel(label: string): string | null {
  const map: Record<string, string> = {
    "Just starting": "beginner",
    "Some experience": "intermediate",
    Confident: "intermediate",
    Seasoned: "advanced",
  };
  return map[label] ?? null;
}

export function mapTimeHorizonLabel(label: string): string | null {
  const map: Record<string, string> = {
    "A few years": "short",
    "5–10 years": "medium",
    "A decade or more": "long",
    Mixed: "medium",
  };
  return map[label] ?? null;
}

export function mapRiskLabel(label: string): string | null {
  const map: Record<string, string> = {
    Cautious: "conservative",
    Balanced: "moderate",
    Bold: "aggressive",
    "Not sure yet": "moderate",
  };
  return map[label] ?? null;
}

export const checkPurposeAlignment = (
  stock: { symbol: string; industry?: string },
  purpose: UserPurpose | null,
): boolean => {
  if (!purpose) return false;

  const purposeLower = purpose.purposeStatement.toLowerCase();
  const goalLower = purpose.primaryGoal.toLowerCase();

  const techKeywords = ["technology", "tech", "innovation", "digital"];
  const financeKeywords = ["financial", "finance", "money", "wealth"];
  const healthcareKeywords = ["health", "medical", "wellness"];

  if (stock.industry) {
    const industryLower = stock.industry.toLowerCase();
    if (industryLower.includes("technology") || industryLower.includes("tech")) {
      return techKeywords.some((keyword) => purposeLower.includes(keyword) || goalLower.includes(keyword));
    }
    if (industryLower.includes("financial") || industryLower.includes("finance")) {
      return financeKeywords.some((keyword) => purposeLower.includes(keyword) || goalLower.includes(keyword));
    }
    if (industryLower.includes("health") || industryLower.includes("medical")) {
      return healthcareKeywords.some((keyword) => purposeLower.includes(keyword) || goalLower.includes(keyword));
    }
  }

  return false;
};

/**
 * A reflection question tailored to the user's stated primary goal — used to
 * anchor journaling to *why* they trade. Falls back to a general prompt.
 */
export const purposeReflectionQuestion = (primaryGoal: string | null | undefined): string => {
  const goal = (primaryGoal ?? "").toLowerCase();
  if (goal.includes("family")) return "How did today's trading move you closer to providing for your family?";
  if (goal.includes("passion")) return "How did today's trading support your ability to pursue your passion?";
  if (goal.includes("cause") || goal.includes("support")) return "How did today's trading help you support the causes you care about?";
  if (goal.includes("generational") || goal.includes("wealth")) return "How did today's trading contribute to building lasting wealth?";
  if (goal.includes("freedom") || goal.includes("independence") || goal.includes("retire"))
    return "How did today's trading move you closer to financial independence?";
  return "How did today's decisions align with the future you're investing in?";
};

export const getDailyQuote = (
  quotes: Array<{ quote: string; author: string; category: string }>,
): { quote: string; author: string; category: string } => {
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem(LAST_QUOTE_DATE_KEY);

  let quoteIndex = 0;

  if (lastDate === today) {
    const storedIndex = localStorage.getItem(QUOTE_STORAGE_KEY);
    quoteIndex = storedIndex ? parseInt(storedIndex, 10) : 0;
  } else {
    const storedIndex = localStorage.getItem(QUOTE_STORAGE_KEY);
    quoteIndex = storedIndex ? (parseInt(storedIndex, 10) + 1) % quotes.length : 0;
    localStorage.setItem(QUOTE_STORAGE_KEY, quoteIndex.toString());
    localStorage.setItem(LAST_QUOTE_DATE_KEY, today);
  }

  return quotes[quoteIndex];
};
