import { supabase } from "@/integrations/supabase/client";

export type AiChatMessage = {
  role: "user" | "assistant";
  content: Array<{ type: "text"; text: string }>;
};

export const ANALYST_SYSTEM_PROMPT =
  "You are TradLyte AI Analyst. Give concise, plain-language research commentary (1-3 sentences). " +
  "Ground answers in the stock context provided. No hype, no guarantees. End with a brief caveat that this is not investment advice.";

export function toAiMessages(
  history: Array<{ role: "user" | "ai"; text: string }>,
): AiChatMessage[] {
  return history.slice(-8).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: [{ type: "text", text: m.text }],
  }));
}

export async function requestAiChat(opts: {
  messages: AiChatMessage[];
  system?: string;
}): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: {
      messages: opts.messages,
      system: opts.system,
    },
  });

  if (error) {
    const ctx = "context" in error ? ((error as { context?: unknown }).context as Response | undefined) : undefined;
    const errText = ctx ? await ctx.text().catch(() => "") : "";
    throw new Error(errText || error.message || "AI request failed");
  }

  const text = (data as { text?: unknown } | null)?.text;
  if (!text) throw new Error("AI returned no response");
  return String(text);
}
