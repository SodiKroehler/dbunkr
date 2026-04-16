import type { StreamCanonMessage, StreamRecord, StubRecord } from "@/lib/data/providers/types";

export type CleanStreamResult = {
  tag: "unseen" | "unrelated" | "none";
  content: string;
};

const ROUTING_UNRELATED = new Set(["IS_UNRELATED", "IS_UNKNOWN"]);

/**
 * Parses assistant output: first line is internal routing only (never user-facing).
 * Public body is everything after the first newline.
 */
export function clean_stream_message(message: string): CleanStreamResult {
  const lines = message.split("\n");
  const firstLine = (lines[0] ?? "").trim();
  const afterFirstLine = lines.slice(1).join("\n").trim();

  if (firstLine === "IS_UNSEEN") {
    return {
      tag: "unseen",
      content: afterFirstLine,
    };
  }

  if (ROUTING_UNRELATED.has(firstLine)) {
    return {
      tag: "unrelated",
      content: afterFirstLine,
    };
  }

  return {
    tag: "none",
    content: lines.length > 1 ? afterFirstLine : message.trim(),
  };
}

/**
 * Filters raw LLM chunks so the client never sees the first line (routing keywords).
 * Call push() in order; use accumulated for persistence / clean_stream_message.
 */
export function createAssistantPublicStreamFilter() {
  let accumulated = "";
  let sawFirstNewline = false;
  let unrelatedMode = false;

  return {
    push(chunk: string): string {
      accumulated += chunk;
      if (!sawFirstNewline) {
        const i = accumulated.indexOf("\n");
        if (i === -1) {
          return "";
        }
        const first = accumulated.slice(0, i).trim();
        sawFirstNewline = true;
        unrelatedMode = ROUTING_UNRELATED.has(first);
        const after = accumulated.slice(i + 1);
        if (unrelatedMode) {
          return "";
        }
        return after;
      }
      if (unrelatedMode) {
        return "";
      }
      return chunk;
    },
    /** If the model never sent a newline, expose the whole buffer (unless it is only a routing keyword). */
    finalize(): string {
      if (sawFirstNewline) {
        return "";
      }
      const t = accumulated.trim();
      if (t === "IS_UNSEEN" || ROUTING_UNRELATED.has(t)) {
        return "";
      }
      return accumulated;
    },
    get accumulated(): string {
      return accumulated;
    },
  };
}

export async function postprocess(
  _keyword: string,
  _streamId: string,
  text: string,
): Promise<string> {
  return text;
}

export function build_stream_system_prompt(
  stub: StubRecord,
  canon: StreamCanonMessage[],
): string {
  const canonText = canon.map((msg) => `${msg.role}: ${msg.content}`).join("\n");
  return [
    `Stub slug: ${stub.slug}`,
    `Research question: ${stub.rq}`,
    `Blurb: ${stub.blurb ?? ""}`,
    `Stream canon:\n${canonText}`,
  ].join("\n\n");
}

export function streamLabel(stream: StreamRecord): string {
  return `${stream.stub_slug} (${stream.llm})`;
}
