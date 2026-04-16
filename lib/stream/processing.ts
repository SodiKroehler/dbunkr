import type { StreamCanonMessage, StreamRecord, StubRecord } from "@/lib/data/providers/types";

export type CleanStreamResult = {
  tag: "unseen" | "unrelated" | "none";
  content: string;
};

export function clean_stream_message(message: string): CleanStreamResult {
  const lines = message.split("\n");
  const firstLine = (lines[0] ?? "").trim();
  const trimmedBody = lines.slice(1).join("\n").trim();

  if (firstLine === "IS_UNSEEN") {
    return {
      tag: "unseen",
      content: trimmedBody,
    };
  }

  if (firstLine === "IS_UNRELATED") {
    return {
      tag: "unrelated",
      content: trimmedBody,
    };
  }

  return {
    tag: "none",
    content: message.trim(),
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
