import { NextResponse } from "next/server";
import { createStreamMessage } from "@/lib/data/provider";

type AcceptBody = {
  session_id?: string;
  entries?: Array<{
    stream_id: string;
    llm: "claude" | "grok";
    content: string;
  }>;
};

export async function POST(
  request: Request,
  _context: { params: { slug: string } },
) {
  const body = (await request.json()) as AcceptBody;
  const sessionId = body.session_id ?? null;
  const entries = body.entries ?? [];

  for (const entry of entries) {
    await createStreamMessage(
      entry.stream_id,
      "assistant",
      sessionId,
      entry.llm,
      "ephemeral",
      entry.content,
    );
  }

  return NextResponse.json({ data: { saved: entries.length } });
}
