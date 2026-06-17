import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveOnboardingComplete } from "@/lib/purposeUtils";
import { Loader2 } from "lucide-react";

/**
 * Landing route for auth redirects (email confirmation, magic link, OAuth).
 * Handles PKCE links (`?code=…` → exchangeCodeForSession) and implicit links
 * (token in the URL hash, auto-detected by supabase-js), then routes onward.
 */
const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const errDesc = params.get("error_description");
      if (errDesc) {
        if (active) setError(errDesc);
        return;
      }
      const code = params.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (exErr) {
          setError(exErr.message);
          return;
        }
      }
      // Implicit flow: detectSessionInUrl already established the session from the hash.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setError("We couldn't complete sign-in from this link.");
        return;
      }
      const complete = await resolveOnboardingComplete(user);
      if (active) navigate(complete ? "/dashboard" : "/onboarding", { replace: true });
    })();
    return () => {
      active = false;
    };
  }, [params, navigate]);

  if (!error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-primary">
        <span className="inline-flex items-center gap-2 font-cap text-sm text-fg-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Confirming your account…
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-primary px-6 text-center">
      <p className="font-cap text-[13px] font-semibold uppercase tracking-[0.18em] text-gold-deep">Confirmation</p>
      <h1 className="font-serif text-[28px] font-medium text-fg-primary">This link didn't work</h1>
      <p className="max-w-md text-[15px] leading-relaxed text-fg-secondary">{error}</p>
      <p className="max-w-md text-[15px] leading-relaxed text-fg-secondary">
        The link may have expired or already been used. Try signing in, or request a new one.
      </p>
      <Link to="/auth" className="mt-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">
        Back to sign in
      </Link>
    </div>
  );
};

export default AuthCallback;
