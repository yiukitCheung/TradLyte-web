import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function assertAllowedPath(pathname: string): void {
  if (
    pathname !== "/backtest" &&
    !pathname.startsWith("/market/") &&
    !pathname.startsWith("/picks/")
  ) {
    throw new Error(`Unsupported gateway path: ${pathname}`);
  }
}

/**
 * Error thrown when the gateway responds with a non-2xx status. Carries the
 * upstream status + body so the UI can log a specific message instead of a
 * generic "fetch failed".
 */
export class MarketGatewayError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, body: string, pathname: string) {
    super(`Market gateway ${status} for ${pathname}: ${body.slice(0, 200)}`);
    this.name = "MarketGatewayError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Proxy to AWS HTTP API via Supabase Edge Function `market-proxy`.
 *
 * The Edge Function is configured with `verify_jwt = false` (see
 * supabase/config.toml) because it serves public market data and the real auth
 * boundary is the upstream gateway key (held in Edge secrets, never sent from
 * the browser). We still send `apikey` so Supabase's API gateway can scope the
 * request to this project. When a user is signed in we also forward their
 * session JWT as the bearer so the function can attribute logs / rate-limit if
 * it ever needs to — but it is never required for the call to succeed.
 */
export async function marketGatewayFetch(
  pathname: string,
  init?: Omit<RequestInit, "headers"> & {
    searchParams?: URLSearchParams | Record<string, string>;
    headers?: HeadersInit;
  },
): Promise<Response> {
  if (!SUPABASE_URL) throw new Error("Missing VITE_SUPABASE_URL.");
  if (!SUPABASE_ANON) throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY.");

  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  assertAllowedPath(cleanPath);

  const { searchParams: spInput, headers: hdrInit, signal, ...rest } = init ?? {};

  const u = new URL(`${SUPABASE_URL}/functions/v1/market-proxy`);
  u.searchParams.set("path", cleanPath);

  if (spInput instanceof URLSearchParams) {
    spInput.forEach((value, key) => u.searchParams.append(key, value));
  } else if (spInput && typeof spInput === "object") {
    Object.entries(spInput).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        u.searchParams.set(key, String(value));
      }
    });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(hdrInit);
  headers.set("apikey", SUPABASE_ANON);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  } else {
    // Anonymous visitors: Supabase scopes the call by `apikey` alone. We still
    // set Authorization to the publishable key because some Supabase gateway
    // variants 401 on a fully missing Authorization header.
    headers.set("Authorization", `Bearer ${SUPABASE_ANON}`);
  }

  let res: Response;
  try {
    res = await fetch(u.toString(), { ...rest, headers, signal });
  } catch (networkErr) {
    if (networkErr instanceof DOMException && networkErr.name === "AbortError") throw networkErr;
    console.error("[marketGatewayFetch] network error", { pathname: cleanPath, err: networkErr });
    throw networkErr;
  }

  if (!res.ok) {
    // Clone before reading so callers that expect a Response (e.g. for debugging)
    // still get a usable body. We only log here; throwing is the caller's choice.
    let body = "";
    try {
      body = await res.clone().text();
    } catch {
      /* ignore */
    }
    console.error("[marketGatewayFetch] non-2xx", {
      pathname: cleanPath,
      status: res.status,
      body: body.slice(0, 500),
    });
  }

  return res;
}
