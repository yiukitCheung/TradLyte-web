import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

// Admin API for the TradLyte admin dashboard.
//
// Why an edge function (and not direct client queries):
//   1. User emails live in `auth.users`, which RLS never exposes to the browser.
//   2. Creating / deleting auth users requires the service-role key, which must
//      never ship to the client.
//   3. All user tables are RLS-scoped to auth.uid(); aggregating across *every*
//      user needs a privileged client.
//
// The real authorization boundary is here: every request is verified to come
// from an admin (email allow-list) before any service-role work happens.

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

// Auto-injected in Supabase Edge Functions.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Comma-separated allow-list; defaults to the canonical admin account.
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "admin@tradlyte.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Resolve the calling user from the request JWT and confirm they are an admin. */
async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; res: Response }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return { ok: false, res: json({ error: "Missing Authorization header" }, 401) };

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return { ok: false, res: json({ error: "Invalid session" }, 401) };

  const email = data.user.email?.toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return { ok: false, res: json({ error: "Forbidden: admin access only" }, 403) };
  }
  return { ok: true };
}

/** Pull every auth user (paginated). Small user base — bounded to 5k. */
async function listAllAuthUsers(admin: ReturnType<typeof createClient>) {
  const all: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    phone: string | null;
  }> = [];
  const perPage = 1000;
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const u of data.users) {
      all.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        phone: u.phone ?? null,
      });
    }
    if (data.users.length < perPage) break;
  }
  return all;
}

/** Tally rows by user_id from a table that has a user_id column. */
async function countByUser(
  admin: ReturnType<typeof createClient>,
  table: string,
): Promise<{ total: number; perUser: Map<string, number> }> {
  const { data, error } = await admin.from(table).select("user_id");
  if (error) throw error;
  const perUser = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ user_id: string }>) {
    perUser.set(row.user_id, (perUser.get(row.user_id) ?? 0) + 1);
  }
  return { total: data?.length ?? 0, perUser };
}

async function buildOverview(admin: ReturnType<typeof createClient>) {
  const [authUsers, profilesRes, strategies, goals, journals, portfolio, regrets] =
    await Promise.all([
      listAllAuthUsers(admin),
      admin.from("profiles").select("id, full_name, onboarding_complete, created_at"),
      countByUser(admin, "user_strategies"),
      countByUser(admin, "user_goals"),
      countByUser(admin, "journal_entries"),
      countByUser(admin, "user_portfolio"),
      countByUser(admin, "user_regrets"),
    ]);

  if (profilesRes.error) throw profilesRes.error;
  const profileById = new Map(
    ((profilesRes.data ?? []) as Array<{
      id: string;
      full_name: string | null;
      onboarding_complete: boolean | null;
    }>).map((p) => [p.id, p]),
  );

  // Recent activity from behavior_logs, enriched with the user's email.
  const { data: logRows, error: logErr } = await admin
    .from("behavior_logs")
    .select("id, user_id, action_type, action_data, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (logErr) throw logErr;
  const emailById = new Map(authUsers.map((u) => [u.id, u.email]));

  const now = Date.now();
  let newToday = 0;
  let new7 = 0;
  let new30 = 0;
  const signupByDay = new Map<string, number>();

  for (const u of authUsers) {
    const t = new Date(u.created_at).getTime();
    if (now - t < DAY_MS) newToday++;
    if (now - t < 7 * DAY_MS) new7++;
    if (now - t < 30 * DAY_MS) new30++;
    if (now - t < 30 * DAY_MS) {
      const day = u.created_at.slice(0, 10);
      signupByDay.set(day, (signupByDay.get(day) ?? 0) + 1);
    }
  }

  // Dense 30-day signup trend (fill gaps with 0).
  const signupTrend: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
    signupTrend.push({ date: day, count: signupByDay.get(day) ?? 0 });
  }

  const users = authUsers
    .map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email,
        fullName: profile?.full_name ?? null,
        phone: u.phone,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        onboardingComplete: profile?.onboarding_complete ?? false,
        strategyCount: strategies.perUser.get(u.id) ?? 0,
        goalCount: goals.perUser.get(u.id) ?? 0,
        journalCount: journals.perUser.get(u.id) ?? 0,
        portfolioCount: portfolio.perUser.get(u.id) ?? 0,
        regretCount: regrets.perUser.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentActivity = ((logRows ?? []) as Array<{
    id: string;
    user_id: string;
    action_type: string;
    action_data: unknown;
    created_at: string;
  }>).map((l) => ({
    id: l.id,
    userId: l.user_id,
    email: emailById.get(l.user_id) ?? null,
    actionType: l.action_type,
    actionData: l.action_data,
    createdAt: l.created_at,
  }));

  return {
    totals: {
      users: authUsers.length,
      strategies: strategies.total,
      goals: goals.total,
      journalEntries: journals.total,
      portfolioHoldings: portfolio.total,
      regrets: regrets.total,
      activityEvents: recentActivity.length,
    },
    newUsers: { today: newToday, last7Days: new7, last30Days: new30 },
    signupTrend,
    users,
    recentActivity,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  let body: { action?: string; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    switch (body.action) {
      case "overview":
        return json(await buildOverview(admin));

      case "createUser": {
        const email = String(body.payload?.email ?? "").trim();
        const password = String(body.payload?.password ?? "");
        const fullName = String(body.payload?.fullName ?? "").trim();
        if (!email || !password) return json({ error: "email and password are required" }, 400);
        if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: fullName ? { full_name: fullName } : undefined,
        });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, userId: data.user?.id });
      }

      case "deleteUser": {
        const userId = String(body.payload?.userId ?? "").trim();
        if (!userId) return json({ error: "userId is required" }, 400);
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      // Mark a user's phone confirmed without an SMS round-trip — for test
      // accounts and manual support overrides. Sets phone_confirmed_at, which is
      // what the mobile app's verify-phone gate checks.
      case "verifyPhone": {
        const userId = String(body.payload?.userId ?? "").trim();
        const phone = String(body.payload?.phone ?? "").trim();
        if (!userId) return json({ error: "userId is required" }, 400);
        if (!phone) return json({ error: "phone (E.164, e.g. +15005550006) is required" }, 400);
        const { data, error } = await admin.auth.admin.updateUserById(userId, {
          phone,
          phone_confirm: true,
        });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, userId: data.user?.id, phoneConfirmedAt: data.user?.phone_confirmed_at ?? null });
      }

      default:
        return json({ error: `Unknown action: ${body.action}` }, 400);
    }
  } catch (e) {
    return json({ error: "Admin operation failed", detail: String(e) }, 500);
  }
});
