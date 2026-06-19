import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Pencil, MapPin, Calendar, Check, Wallet, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FinancialHealthTab from "@/components/financial/FinancialHealthTab";

const stats = [
  { value: "12", label: "Journal streak", color: "text-fg-primary" },
  { value: "148", label: "Entries written", color: "text-fg-primary" },
  { value: "312", label: "Trades logged", color: "text-fg-primary" },
  { value: "82%", label: "Discipline score", color: "text-positive" },
];

const milestones = [
  { label: "Logged 300 trades", done: true },
  { label: "30-day journaling streak", done: true },
  { label: "Reach 1,500 identity points", done: false },
  { label: "Funded every goal on pace", done: false },
];

const activity = [
  { title: "Reflected on NVDA trade", time: "Today · 9:14 PM" },
  { title: "Saved evening debrief", time: "Yesterday" },
  { title: "Hit 12-day streak", time: "2 days ago" },
  { title: "Logged AAPL swing entry", time: "3 days ago" },
  { title: "Wrote weekly review", time: "Last week" },
];

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">Loading…</div>;
  if (!user) return null;

  const name = (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || "Trader";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const handle = `@${(user.email?.split("@")[0] || "trader").toLowerCase()}`;

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-6 py-9 md:px-10">
        <Tabs defaultValue="overview" className="flex flex-1 flex-col gap-6">
          <TabsList className="self-start">
            <TabsTrigger value="overview">
              <UserIcon className="mr-1.5 h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="financial">
              <Wallet className="mr-1.5 h-4 w-4" /> Financial Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="m-0 flex flex-col gap-6">
        {/* Profile header */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border-subtle bg-card p-8 md:flex-row md:items-center">
          <div className="flex items-center gap-6">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gold font-serif text-4xl font-medium text-white">{initials}</span>
            <div>
              <h1 className="font-serif text-[32px] font-medium text-fg-primary">{name}</h1>
              <p className="text-[15px] text-fg-muted">{handle}</p>
              <p className="mt-1.5 max-w-[420px] text-[15px] text-fg-secondary">
                Building discipline one entry at a time. Swing trader, slow and steady.
              </p>
              <div className="mt-2.5 flex items-center gap-4 font-cap text-xs text-fg-muted">
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> San Francisco</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Joined 2024</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3.5">
            <button className="flex items-center gap-2 rounded-full border border-border-strong bg-card px-4.5 py-2.5 text-sm font-medium text-fg-secondary hover:bg-surface-sunken">
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </button>
            <span className="rounded-full bg-ink px-4 py-2 font-cap text-sm font-medium text-gold">Level 4 · Steady Hand</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-2.5 rounded-md border border-border-subtle bg-card p-6">
              <span className={cn("font-serif text-[40px] font-medium leading-none", s.color)}>{s.value}</span>
              <span className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Two column */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
          {/* Trading identity */}
          <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-card p-8">
            <div>
              <p className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">Trading identity</p>
              <h2 className="mt-1 font-serif text-[26px] font-medium text-fg-primary">The Steady Hand</h2>
            </div>
            <div className="flex flex-col gap-3 rounded-md bg-surface-sunken p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg-primary">Level 4 · Steady Hand</span>
                <span className="font-cap text-xs text-fg-muted">Level 5 · Disciplined</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-border-strong">
                <div className="h-3 rounded-full bg-gold-deep" style={{ width: "83%" }} />
              </div>
              <span className="text-[13px] text-fg-secondary">1,240 / 1,500 pts</span>
            </div>
            <div className="flex flex-col gap-3.5">
              <h3 className="text-[15px] font-semibold text-fg-primary">Earned milestones</h3>
              <div className="flex flex-col gap-2.5">
                {milestones.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", m.done ? "bg-positive text-white" : "border border-border-strong bg-card")}>
                      {m.done && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn("text-sm", m.done ? "text-fg-primary" : "text-fg-muted")}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="flex flex-col gap-5 rounded-2xl border border-border-subtle bg-card p-7">
            <div>
              <p className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">Recent activity</p>
              <h2 className="mt-1 font-serif text-[22px] font-medium text-fg-primary">Your journaling rhythm</h2>
            </div>
            <div className="flex flex-col">
              {activity.map((a, i) => (
                <div key={i} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-gold-deep" />
                    {i < activity.length - 1 && <span className="w-0.5 flex-1 bg-border-subtle" />}
                  </div>
                  <div className="pb-5">
                    <div className="text-sm font-medium text-fg-primary">{a.title}</div>
                    <div className="font-cap text-xs text-fg-muted">{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="financial" className="m-0">
            <FinancialHealthTab />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
