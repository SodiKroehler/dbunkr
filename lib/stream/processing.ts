import type { StreamCanonMessage, StreamRecord, StubRecord } from "@/lib/data/providers/types";

export function clean_stream_message(message: string): string {
  return message;
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
