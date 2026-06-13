import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Palette, BadgeCheck, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { icon: User, label: "Account" },
  { icon: Bell, label: "Notifications" },
  { icon: Palette, label: "Appearance" },
  { icon: BadgeCheck, label: "Subscription" },
  { icon: Shield, label: "Security" },
];

const notifToggles = [
  { label: "Daily journal reminder", desc: "An evening nudge to debrief your trades.", on: true },
  { label: "Streak at risk", desc: "A heads-up before your streak lapses.", on: true },
  { label: "Weekly summary email", desc: "Your reflections and pace, every Sunday.", on: false },
  { label: "New level reached", desc: "Celebrate identity milestones.", on: true },
];

const Card = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-card p-7">
    <div>
      <h2 className="font-serif text-xl font-medium text-fg-primary">{title}</h2>
      {desc && <p className="text-sm text-fg-secondary">{desc}</p>}
    </div>
    {children}
  </div>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <label className="flex flex-1 flex-col gap-2">
    <span className="font-cap text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
    <input defaultValue={value} className="rounded-md border border-border-strong bg-surface-primary px-3.5 py-2.5 text-sm text-fg-primary outline-none" />
  </label>
);

const Settings = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState("Account");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">Loading…</div>;
  if (!user) return null;

  const name = (user.user_metadata?.full_name as string | undefined) || "Maya Rodriguez";

  return (
    <div className="flex min-h-screen flex-col bg-surface-primary">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-9 md:px-10">
        <div className="flex flex-col gap-2">
          <p className="font-cap text-[13px] font-medium uppercase tracking-[0.12em] text-gold-deep">Settings</p>
          <h1 className="font-serif text-[36px] font-semibold text-fg-primary">Account &amp; preferences</h1>
          <p className="max-w-[720px] text-base leading-relaxed text-fg-secondary">
            Manage your account, notifications, and how TradLyte works for you.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Nav */}
          <nav className="flex flex-row flex-wrap gap-1 lg:w-[232px] lg:flex-col">
            {nav.map((n) => (
              <button
                key={n.label}
                onClick={() => setActive(n.label)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3.5 py-3 text-[15px] font-medium",
                  active === n.label ? "bg-surface-sunken text-fg-primary" : "text-fg-secondary hover:bg-surface-sunken/60",
                )}
              >
                <n.icon className={cn("h-[19px] w-[19px]", active === n.label ? "text-ink" : "text-fg-muted")} />
                {n.label}
              </button>
            ))}
          </nav>

          {/* Panels */}
          <div className="flex flex-1 flex-col gap-6">
            <Card title="Account" desc="Your public details and contact info.">
              <div className="flex items-center gap-4.5">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold font-serif text-2xl font-medium text-white">
                  {name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </span>
                <button className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-fg-secondary">Change photo</button>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Field label="Full name" value={name} />
                <Field label="Username" value="@maya.trades" />
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Field label="Email" value={user.email || "maya@example.com"} />
                <Field label="Location" value="San Francisco" />
              </div>
              <div className="h-px w-full bg-border-subtle" />
              <div className="flex justify-end gap-3">
                <button className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-fg-primary">Cancel</button>
                <button className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white">Save changes</button>
              </div>
            </Card>

            <Card title="Notifications" desc="Choose what TradLyte reaches out about.">
              <div className="flex flex-col">
                {notifToggles.map((t, i) => (
                  <div key={t.label} className={cn("flex items-center justify-between gap-6 py-4", i < notifToggles.length - 1 && "border-b border-border-subtle")}>
                    <div>
                      <div className="text-[15px] font-medium text-fg-primary">{t.label}</div>
                      <div className="text-[13px] text-fg-muted">{t.desc}</div>
                    </div>
                    <Switch defaultChecked={t.on} />
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Appearance" desc="How TradLyte looks and feels.">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium text-fg-primary">Theme</div>
                  <div className="text-[13px] text-fg-muted">Light is the designed experience.</div>
                </div>
                <div className="flex gap-1 rounded-full bg-surface-sunken p-1">
                  {["Light", "Dark", "System"].map((t) => (
                    <span key={t} className={cn("rounded-full px-3.5 py-1.5 font-cap text-[13px]", t === "Light" ? "bg-card font-semibold text-fg-primary shadow-sm" : "text-fg-muted")}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="h-px w-full bg-border-subtle" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium text-fg-primary">Daily reminder time</div>
                  <div className="text-[13px] text-fg-muted">When your evening nudge arrives.</div>
                </div>
                <span className="rounded-md border border-border-strong bg-surface-primary px-3.5 py-2 text-sm text-fg-primary">9:00 PM</span>
              </div>
            </Card>

            <Card title="Subscription">
              <div className="flex items-center justify-between rounded-md bg-surface-sunken px-5 py-4.5">
                <div>
                  <div className="text-[15px] font-semibold text-fg-primary">TradLyte Pro</div>
                  <div className="text-[13px] text-fg-muted">$12 / month · renews Jul 1</div>
                </div>
                <button className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white">Manage <ChevronRight className="h-3.5 w-3.5" /></button>
              </div>
            </Card>

            <Card title="Security">
              <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                <div>
                  <div className="text-[15px] font-medium text-fg-primary">Password</div>
                  <div className="text-[13px] text-fg-muted">Last changed 3 months ago.</div>
                </div>
                <button onClick={() => navigate("/auth?mode=reset")} className="rounded-full border border-border-strong px-4 py-2 text-sm font-medium text-fg-primary">Change</button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-medium text-fg-primary">Two-factor authentication</div>
                  <div className="text-[13px] text-fg-muted">Add an extra layer of protection.</div>
                </div>
                <Switch />
              </div>
              <div className="h-px w-full bg-border-subtle" />
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-[15px] font-medium text-negative">Sign out</div>
                  <div className="text-[13px] text-fg-muted">End your session on this device.</div>
                </div>
                <button onClick={() => signOut()} className="rounded-full border border-negative/40 px-4 py-2 text-sm font-medium text-negative">Sign out</button>
              </div>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
