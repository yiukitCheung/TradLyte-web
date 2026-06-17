/** Saved Strategy Lab combinations (user_strategies table). Ported from the app. */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { StrategyDraft } from "@/lib/strategyDraft";
import type { BacktestResult } from "@/lib/backtestUtils";

export interface SavedStrategy {
  id: string;
  name: string;
  description: string | null;
  symbol: string | null;
  draft: StrategyDraft;
  result: BacktestResult | null;
  created_at: string | null;
}

export async function listStrategies(userId: string): Promise<SavedStrategy[]> {
  const { data, error } = await supabase
    .from("user_strategies")
    .select("id, name, description, symbol, draft, result, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    symbol: r.symbol,
    draft: r.draft as unknown as StrategyDraft,
    result: (r.result as unknown as BacktestResult | null) ?? null,
    created_at: r.created_at,
  }));
}

export async function saveStrategy(
  userId: string,
  input: {
    name: string;
    description?: string | null;
    symbol?: string | null;
    draft: StrategyDraft;
    result?: BacktestResult | null;
  },
): Promise<void> {
  const { error } = await supabase.from("user_strategies").insert({
    user_id: userId,
    name: input.name,
    description: input.description ?? null,
    symbol: input.symbol ?? null,
    draft: input.draft as unknown as Json,
    result: (input.result ?? null) as unknown as Json | null,
  });
  if (error) throw error;
}

/** Rename / re-describe a saved strategy in place. */
export async function updateStrategy(
  id: string,
  input: { name: string; description?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("user_strategies")
    .update({ name: input.name, description: input.description ?? null })
    .eq("id", id);
  if (error) throw error;
}

/** Clone a saved strategy into a new record the user can tweak independently. */
export async function duplicateStrategy(userId: string, source: SavedStrategy): Promise<void> {
  const name = `${source.name} (copy)`;
  await saveStrategy(userId, {
    name,
    description: source.description,
    symbol: source.symbol,
    draft: { ...source.draft, strategyName: name },
    result: source.result,
  });
}

export async function deleteStrategy(id: string): Promise<void> {
  const { error } = await supabase.from("user_strategies").delete().eq("id", id);
  if (error) throw error;
}
