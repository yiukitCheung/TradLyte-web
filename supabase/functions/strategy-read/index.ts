/**
 * strategy-read — server-side read for the "best strategy for current
 * conditions" card on the stock detail page.
 *
 * Proxies the AWS serving API (URL held server-side in STRATEGY_API_BASE_URL)
 * and caches the generated narrative in `strategy_read_cache` keyed by
 * (symbol, as_of_date) so the first viewer of a symbol pays the generation
 * latency once and everyone after is instant until the weekly data refresh.
 *
 * Request : POST { symbol } (the supabase-js invoke path) or GET ?symbol=
 * Response: { status, symbol, recommendation, narrative }
 *   - status "confirmed" -> recommendation has real backtest numbers; narrative
 *     is the read (or null if generation was briefly unavailable).
 *   - status "cold"/other -> not in the liquid universe yet; both null.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function readSymbol(req: Request): Promise<string | undefined> {
  if (req.method === "GET") {
    return new URL(req.url).searchParams.get("symbol") ?? undefined;
  }
  if (req.method === "POST") {
    try {
      const b = (await req.json()) as { symbol?: unknown };
      return typeof b?.symbol === "string" ? b.symbol : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const base = Deno.env.get("STRATEGY_API_BASE_URL")?.trim().replace(/\/$/, "");
  if (!base) return json({ error: "STRATEGY_API_BASE_URL not set on Edge Function secrets" }, 500);

  const raw = await readSymbol(req);
  const symbol = raw?.trim().toUpperCase();
  if (!symbol) return json({ error: "symbol is required" }, 400);

  // 1) Fast path: confirmed recommendation numbers.
  let reco: Record<string, unknown> | null = null;
  try {
    const r = await fetch(`${base}/recommendation?symbol=${encodeURIComponent(symbol)}`);
    reco = (await r.json()) as Record<string, unknown>;
    if (r.status !== 200 || reco?.status !== "confirmed") {
      return json({ status: (reco?.status as string) ?? "cold", symbol, recommendation: null, narrative: null });
    }
  } catch (e) {
    console.error("[strategy-read] recommendation fetch failed", String(e));
    return json({ status: "unavailable", symbol, recommendation: null, narrative: null }, 502);
  }

  const asOf = String(reco.as_of_date ?? "");

  // 2) Narrative cache (service role bypasses RLS; clients never touch the table).
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let narrative: string | null = null;
  try {
    const { data: hit } = await admin
      .from("strategy_read_cache")
      .select("narrative")
      .eq("symbol", symbol)
      .eq("as_of_date", asOf)
      .maybeSingle();
    if (hit?.narrative) narrative = hit.narrative as string;
  } catch (e) {
    console.error("[strategy-read] cache read failed (non-fatal)", String(e));
  }

  // 3) Miss -> generate once, then store.
  if (!narrative) {
    try {
      const n = await fetch(`${base}/recommendation/narrative?symbol=${encodeURIComponent(symbol)}`);
      const nj = (await n.json()) as { status?: string; narrative?: unknown };
      if (nj?.status === "confirmed" && typeof nj.narrative === "string") {
        narrative = nj.narrative;
        const { error: wErr } = await admin
          .from("strategy_read_cache")
          .upsert({ symbol, as_of_date: asOf, narrative }, { onConflict: "symbol,as_of_date" });
        if (wErr) console.error("[strategy-read] cache write failed (non-fatal)", wErr.message);
      }
      // degraded/cold narrative -> leave null; client shows numbers only.
    } catch (e) {
      console.error("[strategy-read] narrative fetch failed (non-fatal)", String(e));
    }
  }

  return json({ status: "confirmed", symbol, recommendation: reco, narrative });
});
