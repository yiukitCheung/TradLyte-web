import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isAdminEmail } from "@/lib/adminApi";

/**
 * Client-side gate for the admin page. This is UX only — the `admin-api` edge
 * function independently enforces the admin allow-list, so a determined
 * non-admin who reaches the page still gets 403s on every call.
 */
export function useRequireAdmin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = isAdminEmail(user?.email);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!allowed) navigate("/dashboard");
  }, [user, loading, allowed, navigate]);

  return { user, loading, allowed };
}
