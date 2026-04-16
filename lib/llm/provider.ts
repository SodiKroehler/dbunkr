import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";

export type LlmName = "claude" | "grok";

export function getLlmModel(llm: LlmName) {
  if (llm === "grok") {
    return xai("grok-4.1-fast");
  }
  return anthropic("claude-haiku-4-5-20251001");
}
