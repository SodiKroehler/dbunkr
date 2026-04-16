import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";

export type LlmName = "claude" | "grok";

export function getLlmModel(llm: LlmName) {
  if (llm === "grok") {
    return xai(process.env.XAI_MODEL || "grok-4");
  }
  return anthropic(process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001");
}
