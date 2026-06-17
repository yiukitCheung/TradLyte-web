/** User watchlist (user_watchlist table). Ported from the app. */
import { supabase } from "@/integrations/supabase/client";

export interface WatchlistItem {
  id: string;
  symbol: string;
  created_at: string | null;
}

export async function listWatchlist(userId: string): Promise<WatchlistItem[]> {
  const { data, error } = await supabase
    .from("user_watchlist")
    .select("id, symbol, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, symbol: r.symbol, created_at: r.created_at }));
}

/** Idempotent add — relies on the (user_id, symbol) unique constraint. */
export async function addToWatchlist(userId: string, symbol: string): Promise<void> {
  const { error } = await supabase
    .from("user_watchlist")
    .upsert(
      { user_id: userId, symbol: symbol.trim().toUpperCase() },
      { onConflict: "user_id,symbol", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function removeFromWatchlist(userId: string, symbol: string): Promise<void> {
  const { error } = await supabase
    .from("user_watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("symbol", symbol.trim().toUpperCase());
  if (error) throw error;
}

export async function isInWatchlist(userId: string, symbol: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_watchlist")
    .select("id")
    .eq("user_id", userId)
    .eq("symbol", symbol.trim().toUpperCase())
    .maybeSingle();
  return !!data;
}
