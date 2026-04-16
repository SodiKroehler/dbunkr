import type { StreamCanonMessage, StubRecord } from "@/lib/data/providers/types";

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
