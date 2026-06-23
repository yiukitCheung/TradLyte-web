import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfilePurpose } from "@/lib/purposeUtils";

/**
 * Client-side gate for the Pro Strategy Lab.
 *
 * `useAuth()` does not expose the profile/is_pro field directly — the web reads
 * it from the `profiles` table via `fetchProfilePurpose`. This hook does that
 * async check and redirects non-pro users to `/strategy-builder`.
 */
export function useRequirePro() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    let cancelled = false;
    fetchProfilePurpose(user.id).then((profile) => {
      if (cancelled) return;
      if (profile?.is_pro === true) {
        setAllowed(true);
      } else {
        navigate("/strategy-builder");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  return { user, loading: loading || allowed === null, allowed: allowed === true };
}
