import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import {
  createStreamMessage,
  getStreamBySlug,
  getStubBySlug,
  listStreamMessages,
} from "@/lib/data/provider";
import {
  build_stream_system_prompt,
  clean_stream_message,
  postprocess,
} from "@/lib/stream/processing";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const stream = await getStreamBySlug(params.slug);
  if (!stream) {
    return NextResponse.json({ data: { stream: null, canon: [], messages: [] } });
  }

  const messages = await listStreamMessages(stream.id);
  return NextResponse.json({
    data: {
      stream,
      canon: stream.canon,
      messages,
    },
  });
}

type StreamBody = {
  message?: string;
  llm?: "claude" | "grok";
};

export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const body = (await request.json()) as StreamBody;
  const llm = body.llm === "grok" ? "grok" : "claude";
  const incoming = (body.message ?? "").trim();

  if (!incoming) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const stub = await getStubBySlug(params.slug);
  if (!stub) {
    return NextResponse.json({ error: "stub not found" }, { status: 404 });
  }

  const stream = await getStreamBySlug(params.slug, llm);
  if (!stream) {
    return NextResponse.json({ error: "stream not found" }, { status: 404 });
  }

  const cleanedMessage = clean_stream_message(incoming);
  await createStreamMessage(stream.id, "user", cleanedMessage);

  const historyRows = await listStreamMessages(stream.id);
  const history = historyRows.map((row) => ({
    role: row.role,
    content: row.content,
  }));

  const model =
    llm === "claude"
      ? anthropic("claude-sonnet-4-20250514")
      : xai("grok-4");

  const result = streamText({
    model,
    system: clean_stream_message(
      build_stream_system_prompt(stub, stream.canon),
    ),
    messages: history,
    onFinish: async ({ text }) => {
      const processed = await postprocess(params.slug, stream.id, text);
      await createStreamMessage(stream.id, "assistant", processed);
    },
  });

  return result.toTextStreamResponse();
}
