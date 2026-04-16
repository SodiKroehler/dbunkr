import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { streamText } from "ai";
import { NextResponse } from "next/server";
import {
  createStreamMessage,
  getPot,
  getStreamBySlug,
  getStubBySlug,
  listStreamMessages,
} from "@/lib/data/provider";
import {
  clean_stream_message,
  postprocess,
} from "@/lib/stream/processing";
import { build_stream_system_prompt } from "@/lib/prompts";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const { searchParams } = new URL(request.url);
  const llm = searchParams.get("llm") === "grok" ? "grok" : "claude";
  const stream = await getStreamBySlug(params.slug, llm);
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

  const pot = await getPot();
  if (!pot || pot.tokens_remaining <= 0) {
    return NextResponse.json(
      { error: "insufficient pot tokens remaining" },
      { status: 402 },
    );
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
      ? anthropic("claude-haiku-4-5-20251001")
      : xai("grok-4.1-fast");

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
