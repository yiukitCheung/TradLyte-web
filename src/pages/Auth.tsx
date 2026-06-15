import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { resolveOnboardingComplete } from "@/lib/purposeUtils";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Mail,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronDown,
  ShieldCheck,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/lib/countryCodes";

type Mode = "signin" | "signup" | "verify" | "forgot" | "reset";

const headings: Record<Mode, { eyebrow: string; title: string; help?: string }> = {
  signin: { eyebrow: "Welcome back", title: "Sign in to your journal" },
  signup: { eyebrow: "Create account", title: "Start your journal" },
  verify: {
    eyebrow: "Verify phone",
    title: "Enter your code",
    help: "We sent a 6-digit code by text. Enter it below to finish creating your account.",
  },
  forgot: {
    eyebrow: "Reset password",
    title: "Forgot your password?",
    help: "No worries. Enter your email and we'll send you a link to reset it.",
  },
  reset: { eyebrow: "New password", title: "Set a new password" },
};

/** Normalize a user-entered phone to E.164 (e.g. +14155552671). */
const normalizePhone = (raw: string): string => {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  return digits ? `+${digits}` : "";
};

const friendlyAuthError = (message: string): string => {
  if (/email rate limit exceeded/i.test(message)) {
    return "Too many sign-up attempts for this email. Wait about an hour, try a different email, or disable “Confirm email” in Supabase — phone OTP is your verification step.";
  }
  return message;
};

const labelClass = "font-cap text-xs tracking-wide text-fg-muted";
const inputWrap =
  "flex items-center justify-between gap-2 rounded-md border border-border-strong bg-card px-3.5 py-3.5";
const inputBase =
  "w-full bg-transparent text-[15px] text-fg-primary outline-none placeholder:text-fg-muted";
const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60";

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <span className={labelClass}>{label}</span>
    {children}
  </div>
);

const PasswordInput = ({
  name,
  placeholder,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) => {
  const [show, setShow] = useState(false);
  return (
    <div className={inputWrap}>
      <input
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className={inputBase}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-fg-muted"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
};

// Country picker + local number. Submits a combined E.164 value via a hidden
// "phone" input, so the user never types a country/area code by hand.
const PhoneInput = () => {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [number, setNumber] = useState("");
  const localDigits = number.replace(/\D/g, "");
  const e164 = `+${country.dial}${localDigits}`;

  return (
    <div className={cn(inputWrap, "pl-2")}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[15px] text-fg-primary transition-colors hover:bg-surface-sunken"
            aria-label="Select country code"
          >
            <span className="text-base leading-none">{country.flag}</span>
            <span>+{country.dial}</span>
            <ChevronDown className="h-3.5 w-3.5 text-fg-muted" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command
            filter={(value, search) =>
              value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            }
          >
            <CommandInput placeholder="Search country or code…" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((c) => (
                  <CommandItem
                    key={c.iso}
                    value={`${c.name} +${c.dial} ${c.iso}`}
                    onSelect={() => {
                      setCountry(c);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2.5"
                  >
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-fg-muted">+{c.dial}</span>
                    {country.iso === c.iso && <Check className="h-4 w-4 text-gold-deep" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <span className="h-5 w-px flex-shrink-0 bg-border-strong" />
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required
        placeholder="415 555 2671"
        className={inputBase}
        value={number}
        onChange={(e) => setNumber(e.target.value)}
      />
      <input type="hidden" name="phone" value={e164} />
    </div>
  );
};

const BrandPanel = () => (
  <div className="hidden flex-col justify-between bg-surface-inverse bg-gradient-primary p-12 lg:flex">
    <Link to="/" className="flex items-center gap-2.5">
      <span className="h-[18px] w-[18px] rounded-full bg-gold" />
      <span className="font-serif text-[22px] text-white">TradLyte</span>
    </Link>
    <div className="max-w-[520px]">
      <h2 className="font-serif text-[38px] leading-tight text-white">
        End your trading day with a clear mind.
      </h2>
      <p className="mt-5 text-base leading-relaxed text-white/70">
        A quiet space to journal your trades, reflect on your decisions, and grow as a
        disciplined investor.
      </p>
    </div>
    <div className="max-w-[480px]">
      <p className="font-serif text-lg italic leading-relaxed text-white/80">
        “The best traders I know spend more time reviewing than trading.”
      </p>
      <p className="mt-3 font-cap text-[13px] tracking-wide text-white/50">
        MAYA CHEN · PORTFOLIO MANAGER
      </p>
    </div>
  </div>
);

const PasswordStrength = ({ value }: { value: string }) => {
  const rules = [
    { label: "8+ characters", ok: value.length >= 8 },
    { label: "One number", ok: /\d/.test(value) },
    { label: "One symbol", ok: /[^A-Za-z0-9]/.test(value) },
  ];
  const score = rules.filter((r) => r.ok).length + (value.length >= 12 ? 1 : 0);
  const segColor = (i: number) =>
    i < score
      ? score >= 3
        ? "bg-positive"
        : "bg-gold-deep"
      : "bg-border-strong";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", segColor(i))} />
        ))}
      </div>
      <div className="flex gap-4">
        {rules.map((r) => (
          <span key={r.label} className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Check className={cn("h-3 w-3", r.ok ? "text-positive" : "text-border-strong")} />
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const Auth = () => {
  const { signIn, signUp, verifyPhone, resendPhoneOtp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    (params.get("mode") as Mode) || "signin",
  );
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  // Set before sign-up so the "already signed in" redirect below doesn't fire
  // before the user has verified their phone.
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  useEffect(() => {
    if (
      !loading &&
      user &&
      mode !== "reset" &&
      mode !== "verify" &&
      !awaitingVerification
    ) {
      resolveOnboardingComplete(user).then((complete) => {
        navigate(complete ? "/dashboard" : "/onboarding");
      });
    }
  }, [user, loading, navigate, mode, awaitingVerification]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await signIn(fd.get("email") as string, fd.get("password") as string);
    error ? toast.error(error.message) : toast.success("Welcome back!");
    setSubmitting(false);
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAwaitingVerification(true);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const phone = normalizePhone(fd.get("phone") as string);
    const { error } = await signUp(
      fd.get("email") as string,
      fd.get("password") as string,
      fd.get("fullName") as string,
      phone,
    );
    if (error) {
      toast.error(friendlyAuthError(error.message));
      setAwaitingVerification(false);
      setSubmitting(false);
      return;
    }
    // Account created — sign-up already texted the validation code.
    setPendingPhone(phone);
    setMode("verify");
    toast.success("We texted you a verification code.");
    setSubmitting(false);
  };

  const onVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await verifyPhone(pendingPhone, (fd.get("code") as string).trim());
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Phone verified!");
      setAwaitingVerification(false);
      navigate("/onboarding");
    }
    setSubmitting(false);
  };

  const onResendOtp = async () => {
    if (!pendingPhone) return;
    setSubmitting(true);
    const { error } = await resendPhoneOtp(pendingPhone);
    error ? toast.error(error.message) : toast.success("A new code is on its way.");
    setSubmitting(false);
  };

  const onForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.auth.resetPasswordForEmail(fd.get("email") as string, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    if (error) toast.error(error.message);
    else toast.success("If an account exists, a reset link is on its way.");
    setSubmitting(false);
  };

  const onReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("confirm")) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: fd.get("password") as string });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated. Please sign in again.");
      setMode("signin");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-primary text-fg-muted">
        Loading…
      </div>
    );
  }

  const h = headings[mode];

  return (
    <div className="grid min-h-screen grid-cols-1 bg-surface-primary lg:grid-cols-2">
      <BrandPanel />

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="flex w-full max-w-[400px] flex-col gap-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 lg:hidden"
          >
            <span className="h-[18px] w-[18px] rounded-full bg-ink" />
            <span className="font-serif text-[22px] text-fg-primary">TradLyte</span>
          </Link>

          <div className="flex flex-col gap-2.5">
            <p className="font-cap text-xs uppercase tracking-[0.16em] text-gold-deep">
              {h.eyebrow}
            </p>
            <h1 className="font-serif text-3xl leading-tight text-fg-primary">{h.title}</h1>
            {h.help && <p className="text-[15px] leading-relaxed text-fg-secondary">{h.help}</p>}
          </div>

          {mode === "signin" && (
            <form onSubmit={onSignIn} className="flex flex-col gap-5">
              <Field label="Email">
                <div className={inputWrap}>
                  <input name="email" type="email" required placeholder="maya@example.com" className={inputBase} />
                </div>
              </Field>
              <Field label="Password">
                <PasswordInput name="password" required placeholder="••••••••" />
              </Field>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-fg-secondary">
                  <input type="checkbox" className="h-[18px] w-[18px] rounded border-border-strong accent-ink" />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-sm text-gold-deep hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={submitting} className={primaryBtn}>
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={onSignUp} className="flex flex-col gap-5">
              <Field label="Full name">
                <div className={inputWrap}>
                  <input name="fullName" required placeholder="Maya Rodriguez" className={inputBase} />
                </div>
              </Field>
              <Field label="Email">
                <div className={inputWrap}>
                  <input name="email" type="email" required placeholder="you@example.com" className={inputBase} />
                </div>
              </Field>
              <Field label="Phone number">
                <PhoneInput />
              </Field>
              <Field label="Password">
                <PasswordInput
                  name="password"
                  required
                  minLength={8}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <PasswordStrength value={password} />
              <p className="flex items-start gap-2 text-[13px] leading-snug text-fg-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                Include your country code. We'll text a code to verify your number.
              </p>
              <button type="submit" disabled={submitting} className={primaryBtn}>
                {submitting ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          {mode === "verify" && (
            <form onSubmit={onVerify} className="flex flex-col gap-5">
              <Field label="Verification code">
                <div className={inputWrap}>
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d*"
                    maxLength={6}
                    required
                    placeholder="123456"
                    className={cn(inputBase, "tracking-[0.4em]")}
                  />
                </div>
              </Field>
              {pendingPhone && (
                <p className="text-[13px] text-fg-secondary">
                  Code sent to <span className="font-semibold text-fg-primary">{pendingPhone}</span>.
                </p>
              )}
              <button type="submit" disabled={submitting} className={primaryBtn}>
                {submitting ? "Verifying…" : "Verify & continue"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onResendOtp}
                disabled={submitting}
                className="text-sm font-semibold text-gold-deep disabled:opacity-60"
              >
                Didn't get a code? Resend
              </button>
              <button
                type="button"
                onClick={() => {
                  setAwaitingVerification(false);
                  setMode("signup");
                }}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-fg-muted"
              >
                <ArrowLeft className="h-[15px] w-[15px]" /> Back
              </button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={onForgot} className="flex flex-col gap-6">
              <Field label="Email">
                <div className={inputWrap}>
                  <input name="email" type="email" required placeholder="you@example.com" className={inputBase} />
                  <Mail className="h-[18px] w-[18px] text-fg-muted" />
                </div>
              </Field>
              <button type="submit" disabled={submitting} className={primaryBtn}>
                {submitting ? "Sending…" : "Send reset link"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-2.5 rounded-md bg-surface-sunken p-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-fg-muted" />
                <p className="text-[13px] leading-snug text-fg-secondary">
                  For your security, we won't reveal whether an account exists for this email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gold-deep"
              >
                <ArrowLeft className="h-[15px] w-[15px]" /> Back to sign in
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={onReset} className="flex flex-col gap-5">
              <Field label="New password">
                <PasswordInput
                  name="password"
                  required
                  minLength={8}
                  placeholder="Enter a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <PasswordStrength value={password} />
              <Field label="Confirm password">
                <PasswordInput name="confirm" required placeholder="Re-enter your password" />
              </Field>
              <button type="submit" disabled={submitting} className={primaryBtn}>
                {submitting ? "Updating…" : "Update password"}
              </button>
              <div className="flex items-center justify-center gap-2 text-[13px] text-fg-muted">
                <Info className="h-3.5 w-3.5" />
                You'll be signed out and asked to sign in again.
              </div>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="flex items-center justify-center gap-1.5 text-sm font-semibold text-gold-deep"
              >
                <ArrowLeft className="h-[15px] w-[15px]" /> Back to sign in
              </button>
            </form>
          )}

          {/* Switch (sign in / sign up only) */}
          {(mode === "signin" || mode === "signup") && (
            <div className="flex justify-center gap-1.5 text-sm text-fg-secondary">
              {mode === "signin" ? (
                <>
                  New to TradLyte?
                  <button onClick={() => setMode("signup")} className="font-semibold text-gold-deep">
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?
                  <button onClick={() => setMode("signin")} className="font-semibold text-gold-deep">
                    Sign in
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
