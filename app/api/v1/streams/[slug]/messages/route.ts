import { streamText } from "ai";
import { NextResponse } from "next/server";
import {
  chargeSitePotFromMessage,
  createStreamMessage,
  getPotState,
  getStreamBySlug,
  getStubBySlug,
  listStreamMessages,
} from "@/lib/data/provider";
import { sitePotCostFromMessage } from "@/lib/pot/site-cost";
import {
  clean_stream_message,
  createAssistantPublicStreamFilter,
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
  session_id?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  debugLog("Incoming stream POST request", { slug: params.slug });
  const body = (await request.json()) as StreamBody;
  const llm = body.llm === "grok" ? "grok" : "claude";
  const incoming = (body.message ?? "").trim();
  const sessionId = body.session_id ?? null;
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

  const { site } = await getPotState();
  const siteCost = sitePotCostFromMessage(incoming);
  debugLog("Fetched pot state", {
    potFound: Boolean(site),
    tokensRemaining: site?.tokens_remaining ?? null,
    siteCost,
  });
  if (!site || site.tokens_remaining < siteCost) {
    debugLog("Declining request: insufficient pot tokens", {
      tokensRemaining: site?.tokens_remaining ?? null,
      siteCost,
    });
    return NextResponse.json(
      { error: "insufficient pot tokens remaining" },
      { status: 402 },
    );
  }

  await chargeSitePotFromMessage(incoming);
  debugLog("Charged site pot for message", { siteCost });

  const cleanedMessage = incoming;
  debugLog("Message cleaned", {
    originalLength: incoming.length,
    cleanedLength: cleanedMessage.length,
  });
  const sessionSuffix = sessionId ? sessionId.slice(-4) : "anon";
  const userUname = `user-${sessionSuffix}`;
  await createStreamMessage(
    stream.id,
    "user",
    sessionId,
    userUname,
    "ephemeral",
    cleanedMessage,
  );
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

  const systemPrompt = build_stream_system_prompt(stub, stream.canon, cleanedMessage);
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
  });

  const streamFilter = createAssistantPublicStreamFilter();
  const encoder = new TextEncoder();

  const responseBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          const toClient = streamFilter.push(chunk);
          if (toClient) {
            controller.enqueue(encoder.encode(toClient));
          }
        }
        const tail = streamFilter.finalize();
        if (tail) {
          controller.enqueue(encoder.encode(tail));
        }

        const raw = streamFilter.accumulated;
        debugLog("LLM stream finished", {
          streamId: stream.id,
          textLength: raw.length,
        });
        const cleanedOutput = clean_stream_message(raw);
        const processed = await postprocess(
          params.slug,
          stream.id,
          cleanedOutput.content,
        );
        debugLog("Postprocess complete", {
          streamId: stream.id,
          processedLength: processed.length,
        });
        const messageType = cleanedOutput.tag === "unseen" ? "proposed" : "ephemeral";
        await createStreamMessage(
          stream.id,
          "assistant",
          sessionId,
          llm,
          messageType,
          processed,
        );
        debugLog("Stored assistant message", {
          streamId: stream.id,
          role: "assistant",
        });
      } catch (error) {
        debugLog("Stream pipeline error", {
          streamId: stream.id,
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  debugLog("Returning filtered text stream response", { streamId: stream.id });
  return new Response(responseBody, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
