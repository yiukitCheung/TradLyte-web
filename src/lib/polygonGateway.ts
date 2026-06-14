import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Proxy to Polygon REST via the Supabase Edge Function `polygon-proxy`.
 * The Polygon key lives in Edge secrets — never in the browser. Public data
 * (`verify_jwt = false`), so it works for logged-out visitors too; we still
 * forward the session token when present for log attribution.
 */
export async function polygonProxyFetch(
  pathname: string,
  init?: Omit<RequestInit, "headers"> & {
    searchParams?: URLSearchParams | Record<string, string>;
    headers?: HeadersInit;
  },
): Promise<Response> {
  if (!SUPABASE_URL) throw new Error("Missing VITE_SUPABASE_URL.");
  if (!SUPABASE_ANON) throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY.");

  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const { searchParams: spInput, headers: hdrInit, signal, ...rest } = init ?? {};

  const u = new URL(`${SUPABASE_URL}/functions/v1/polygon-proxy`);
  u.searchParams.set("path", cleanPath);
  if (spInput instanceof URLSearchParams) {
    spInput.forEach((value, key) => u.searchParams.append(key, value));
  } else if (spInput && typeof spInput === "object") {
    Object.entries(spInput).forEach(([key, value]) => {
      if (value !== undefined && value !== null) u.searchParams.set(key, String(value));
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(hdrInit);
  headers.set("apikey", SUPABASE_ANON);
  headers.set("Authorization", `Bearer ${session?.access_token ?? SUPABASE_ANON}`);

  return fetch(u.toString(), { ...rest, headers, signal });
}
