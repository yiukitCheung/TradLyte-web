import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import {
  fetchAdminOverview,
  createAdminUser,
  deleteAdminUser,
  verifyAdminUserPhone,
  type AdminOverview,
  type AdminUserRow,
} from "@/lib/adminApi";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Trash2,
  BadgeCheck,
  Loader2,
  RefreshCw,
  TrendingUp,
  Layers,
  Target,
  Feather,
  Activity,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const eyebrow = "font-cap text-[11px] uppercase tracking-[0.14em] text-gold-deep";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-card p-5">
      <div className="flex items-center gap-2 text-fg-muted">
        <Icon className="h-4 w-4" />
        <span className={eyebrow}>{label}</span>
      </div>
      <div className="mt-3 font-serif text-3xl font-medium text-fg-primary">{value}</div>
      {sub && <div className="mt-1 text-sm text-fg-secondary">{sub}</div>}
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const Admin = () => {
  const { loading: authLoading, allowed } = useRequireAdmin();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Create-user dialog state.
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Delete confirm state.
  const [toDelete, setToDelete] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Verify-phone dialog state.
  const [toVerify, setToVerify] = useState<AdminUserRow | null>(null);
  const [verifyPhoneInput, setVerifyPhoneInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminOverview());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }, [data, query]);

  const handleCreate = async () => {
    if (!newEmail.trim() || newPassword.length < 8) {
      toast.error("Email and a password of at least 8 characters are required");
      return;
    }
    setCreating(true);
    try {
      await createAdminUser({ email: newEmail.trim(), password: newPassword, fullName: newName.trim() });
      toast.success(`Created ${newEmail.trim()}`);
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteAdminUser(toDelete.id);
      toast.success(`Deleted ${toDelete.email ?? toDelete.id}`);
      setToDelete(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const openVerify = (u: AdminUserRow) => {
    setToVerify(u);
    // Prefill with the existing number (E.164) when present, else a country prefix.
    setVerifyPhoneInput(u.phone ? (u.phone.startsWith("+") ? u.phone : `+${u.phone}`) : "+1");
  };

  const handleVerifyPhone = async () => {
    if (!toVerify) return;
    const phone = verifyPhoneInput.trim();
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      toast.error("Enter a valid E.164 phone, e.g. +15005550006");
      return;
    }
    setVerifying(true);
    try {
      await verifyAdminUserPhone({ userId: toVerify.id, phone });
      toast.success(`Phone marked verified for ${toVerify.email ?? toVerify.id}`);
      setToVerify(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to verify phone");
    } finally {
      setVerifying(false);
    }
  };

  // Gate: while resolving auth or redirecting a non-admin, render nothing useful.
  if (authLoading || !allowed) {
    return (
      <div className="min-h-screen bg-surface-primary">
        <Header />
        <div className="flex h-[60vh] items-center justify-center text-fg-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1280px] px-6 py-10 md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={eyebrow}>Internal</p>
            <h1 className="mt-1 font-serif text-3xl font-medium text-fg-primary">Admin dashboard</h1>
            <p className="mt-1 text-sm text-fg-secondary">
              User analytics and account management for TradLyte.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              New user
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-negative/40 bg-negative-soft p-4 text-sm text-negative">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="mt-10 flex items-center justify-center text-fg-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                icon={Users}
                label="Total users"
                value={data.totals.users}
                sub={`${data.newUsers.last30Days} new in 30 days`}
              />
              <StatCard
                icon={TrendingUp}
                label="New users"
                value={data.newUsers.today}
                sub={`Today · ${data.newUsers.last7Days} this week`}
              />
              <StatCard icon={Layers} label="Strategies" value={data.totals.strategies} />
              <StatCard icon={Target} label="Goals" value={data.totals.goals} />
              <StatCard icon={Feather} label="Journal entries" value={data.totals.journalEntries} />
              <StatCard icon={TrendingUp} label="Portfolio holdings" value={data.totals.portfolioHoldings} />
              <StatCard icon={Activity} label="Logged activity" value={data.totals.activityEvents} />
              <StatCard icon={Users} label="Onboarded" value={data.users.filter((u) => u.onboardingComplete).length} />
            </div>

            {/* Signup trend */}
            <section className="mt-8 rounded-2xl border border-border-subtle bg-card p-6">
              <p className={eyebrow}>Signups · last 30 days</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.signupTrend} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => d.slice(5)}
                      tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }}
                      interval={4}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--fg-muted))" }} width={32} />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid hsl(var(--border-subtle))",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--accent-deep))"
                      strokeWidth={2}
                      fill="url(#signupFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Users table */}
            <section className="mt-8 rounded-2xl border border-border-subtle bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-5">
                <p className={eyebrow}>Users ({data.users.length})</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search email, name, id"
                    className="w-64 pl-9"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-fg-muted">
                      <th className="px-5 py-3 font-medium">User</th>
                      <th className="px-5 py-3 font-medium">Joined</th>
                      <th className="px-5 py-3 font-medium">Last sign-in</th>
                      <th className="px-5 py-3 text-center font-medium">Onboarded</th>
                      <th className="px-5 py-3 text-center font-medium">Strat.</th>
                      <th className="px-5 py-3 text-center font-medium">Goals</th>
                      <th className="px-5 py-3 text-center font-medium">Journal</th>
                      <th className="px-5 py-3 text-center font-medium">Holdings</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-border-subtle/60 last:border-0">
                        <td className="px-5 py-3">
                          <div className="font-medium text-fg-primary">{u.fullName || "—"}</div>
                          <div className="text-xs text-fg-muted">{u.email ?? u.id}</div>
                        </td>
                        <td className="px-5 py-3 text-fg-secondary">{fmtDate(u.createdAt)}</td>
                        <td className="px-5 py-3 text-fg-secondary">{fmtDate(u.lastSignInAt)}</td>
                        <td className="px-5 py-3 text-center">
                          {u.onboardingComplete ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-positive" title="Onboarded" />
                          ) : (
                            <span className="inline-block h-2 w-2 rounded-full bg-border-strong" title="Not onboarded" />
                          )}
                        </td>
                        <td className="px-5 py-3 text-center text-fg-secondary">{u.strategyCount}</td>
                        <td className="px-5 py-3 text-center text-fg-secondary">{u.goalCount}</td>
                        <td className="px-5 py-3 text-center text-fg-secondary">{u.journalCount}</td>
                        <td className="px-5 py-3 text-center text-fg-secondary">{u.portfolioCount}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openVerify(u)}
                              aria-label={`Mark phone verified for ${u.email ?? u.id}`}
                              title="Mark phone verified"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-positive-soft hover:text-positive"
                            >
                              <BadgeCheck className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setToDelete(u)}
                              aria-label={`Delete ${u.email ?? u.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-negative-soft hover:text-negative"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-5 py-10 text-center text-fg-muted">
                          No users match “{query}”.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent activity */}
            <section className="mt-8 rounded-2xl border border-border-subtle bg-card p-6">
              <p className={eyebrow}>Recent activity (behavior logs)</p>
              {data.recentActivity.length === 0 ? (
                <p className="mt-4 text-sm text-fg-secondary">
                  No behavior logs yet. Activity is recorded as users interact (e.g. logging trade
                  regrets); this list fills in over time.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-border-subtle/60">
                  {data.recentActivity.slice(0, 25).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-fg-primary">{a.actionType}</span>
                        <span className="ml-2 text-fg-muted">{a.email ?? a.userId.slice(0, 8)}</span>
                      </div>
                      <span className="shrink-0 text-xs text-fg-muted">{fmtDateTime(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a user</DialogTitle>
            <DialogDescription>
              Creates a confirmed account directly (no email verification needed).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="person@example.com"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Full name (optional)</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Temporary password</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark phone verified dialog */}
      <Dialog open={!!toVerify} onOpenChange={(o) => !o && setToVerify(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark phone verified</DialogTitle>
            <DialogDescription>
              Confirms the phone for <strong>{toVerify?.email ?? toVerify?.id}</strong> without an SMS,
              so the account skips the mobile phone-verification step. Use a real or test number in
              E.164 format (e.g. +15005550006).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="verify-phone">Phone (E.164)</Label>
            <Input
              id="verify-phone"
              value={verifyPhoneInput}
              onChange={(e) => setVerifyPhoneInput(e.target.value)}
              placeholder="+15005550006"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToVerify(null)} disabled={verifying}>
              Cancel
            </Button>
            <Button onClick={handleVerifyPhone} disabled={verifying}>
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark verified
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently deletes <strong>{toDelete?.email ?? toDelete?.id}</strong> and all of their
              data (strategies, goals, journal, portfolio). This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-negative text-white hover:bg-negative/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
