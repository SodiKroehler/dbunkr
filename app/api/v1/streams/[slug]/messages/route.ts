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
import { getLlmModel } from "@/lib/llm/provider";

const DEBUG =
  process.env.DEBUG === "true" ||
  process.env.DEBUG === "1" ||
  process.env.DEBUG === "yes";

function debugLog(message: string, context?: Record<string, unknown>) {
  if (!DEBUG) return;
  const stamp = new Date().toISOString();
  if (context) {
    console.log(`[stream-debug ${stamp}] ${message}`, context);
    return;
  }
  console.log(`[stream-debug ${stamp}] ${message}`);
}

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
  debugLog("Incoming stream POST request", { slug: params.slug });
  const body = (await request.json()) as StreamBody;
  const llm = body.llm === "grok" ? "grok" : "claude";
  const incoming = (body.message ?? "").trim();
  debugLog("Parsed stream POST body", {
    llm,
    incomingLength: incoming.length,
  });

  if (!incoming) {
    debugLog("Declining request: empty incoming message");
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const stub = await getStubBySlug(params.slug);
  if (!stub) {
    debugLog("Declining request: stub not found", { slug: params.slug });
    return NextResponse.json({ error: "stub not found" }, { status: 404 });
  }
  debugLog("Resolved stub", { stubId: stub.id, stubSlug: stub.slug });

  const stream = await getStreamBySlug(params.slug, llm);
  if (!stream) {
    debugLog("Declining request: stream not found", { slug: params.slug, llm });
    return NextResponse.json({ error: "stream not found" }, { status: 404 });
  }
  debugLog("Resolved stream", {
    streamId: stream.id,
    llm: stream.llm,
    canonCount: stream.canon.length,
  });

  const pot = await getPot();
  debugLog("Fetched pot state", {
    potFound: Boolean(pot),
    tokensRemaining: pot?.tokens_remaining ?? null,
  });
  if (!pot || pot.tokens_remaining <= 0) {
    debugLog("Declining request: insufficient pot tokens", {
      tokensRemaining: pot?.tokens_remaining ?? null,
    });
    return NextResponse.json(
      { error: "insufficient pot tokens remaining" },
      { status: 402 },
    );
  }

  const cleanedMessage = clean_stream_message(incoming);
  debugLog("Message cleaned", {
    originalLength: incoming.length,
    cleanedLength: cleanedMessage.length,
  });
  await createStreamMessage(stream.id, "user", cleanedMessage);
  debugLog("Stored user message", {
    streamId: stream.id,
    role: "user",
  });

  const historyRows = await listStreamMessages(stream.id);
  const history = historyRows.map((row) => ({
    role: row.role,
    content: row.content,
  }));
  debugLog("Loaded stream history", {
    streamId: stream.id,
    historyCount: history.length,
  });

  const model = getLlmModel(llm);
  debugLog("Selected model", {
    llm,
    modelId: llm,
  });

  const systemPrompt = clean_stream_message(
    build_stream_system_prompt(stub, stream.canon),
  );
  debugLog("Built system prompt", { promptLength: systemPrompt.length });

  const result = streamText({
    model,
    system: systemPrompt,
    messages: history,
    onError: ({ error }) => {
      debugLog("LLM streaming error", {
        streamId: stream.id,
        message: error instanceof Error ? error.message : String(error),
      });
    },
    onFinish: async ({ text }) => {
      debugLog("LLM stream finished", {
        streamId: stream.id,
        textLength: text.length,
      });
      const processed = await postprocess(params.slug, stream.id, text);
      debugLog("Postprocess complete", {
        streamId: stream.id,
        processedLength: processed.length,
      });
      await createStreamMessage(stream.id, "assistant", processed);
      debugLog("Stored assistant message", {
        streamId: stream.id,
        role: "assistant",
      });
    },
  });

  debugLog("Returning text stream response", { streamId: stream.id });
  return result.toTextStreamResponse();
}
