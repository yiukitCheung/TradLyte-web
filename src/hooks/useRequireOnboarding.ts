import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { resolveOnboardingComplete } from "@/lib/purposeUtils";

/** Redirect to /onboarding only when Supabase says the user has not completed setup. */
export function useRequireOnboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    let cancelled = false;
    resolveOnboardingComplete(user).then((complete) => {
      if (cancelled) return;
      if (!complete) {
        navigate("/onboarding");
        return;
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  return { user, loading: loading || !ready, ready };
}
