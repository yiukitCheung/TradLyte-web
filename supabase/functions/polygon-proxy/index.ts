/**
 * polygon-proxy — server-side proxy for Polygon.io REST (delayed) aggregates.
 *
 * The browser calls `?path=/v2/aggs/...`; this function injects the secret
 * `POLYGON_API_KEY` (never exposed to the client) and forwards to api.polygon.io.
 * Mirrors `market-proxy`. Read-only GET; a strict allowlist prevents this from
 * becoming an open proxy / SSRF.
 */

const POLYGON_BASE = "https://api.polygon.io";

/** Only Polygon aggregate + ticker-news endpoints are allowed. */
function isAllowedPath(path: string): boolean {
  if (!path.startsWith("/") || path.includes("://") || path.startsWith("//") || path.includes("..")) return false;
  // /v2/aggs/ticker/{T}/range/1/minute/{from}/{to}  and  /v2/aggs/ticker/{T}/prev
  // /v2/reference/news?ticker={T}
  return path.startsWith("/v2/aggs/") || path.startsWith("/v2/reference/news");
}

function toHeaderByteString(value: string): string {
  return value.replace(/[\r\n\t]/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "").trim();
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Only GET is supported" }), {
      status: 405,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("POLYGON_API_KEY")?.trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "POLYGON_API_KEY is not set on Edge Function secrets" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParam = url.searchParams.get("path");
    if (!pathParam || !isAllowedPath(pathParam)) {
      return new Response(JSON.stringify({ error: "Missing or forbidden path param" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    url.searchParams.delete("path");
    const qs = url.searchParams.toString();
    const destUrl = `${POLYGON_BASE}${pathParam}${qs ? `?${qs}` : ""}`;

    const headersOut = new Headers();
    const safeKey = toHeaderByteString(apiKey);
    if (!safeKey) {
      return new Response(JSON.stringify({ error: "POLYGON_API_KEY invalid after sanitization" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    headersOut.set("Authorization", `Bearer ${safeKey}`);

    const upstream = await fetch(destUrl, { method: "GET", headers: headersOut });
    const outHeaders = new Headers(corsHeaders);
    const uct = upstream.headers.get("content-type");
    if (uct) outHeaders.set("content-type", toHeaderByteString(uct));
    return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[polygon-proxy]", msg);
    return new Response(JSON.stringify({ error: "Upstream fetch failed", detail: msg }), {
      status: 502,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
