import { streamText } from "ai";
import { NextResponse } from "next/server";
import {
  createStreamMessage,
  getPot,
  getStubBySlug,
  listStreamMessages,
  listStreamsBySlug,
} from "@/lib/data/provider";
import { getLlmModel, type LlmName } from "@/lib/llm/provider";
import { build_stream_system_prompt } from "@/lib/prompts";
import { clean_stream_message, postprocess } from "@/lib/stream/processing";

type RiverBody = {
  message?: string;
  session_id?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const body = (await request.json()) as RiverBody;
  const incoming = (body.message ?? "").trim();
  const sessionId = body.session_id ?? null;

  if (!incoming) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const stub = await getStubBySlug(params.slug);
  if (!stub) {
    return NextResponse.json({ error: "stub not found" }, { status: 404 });
  }

  const pot = await getPot();
  if (!pot || pot.tokens_remaining <= 0) {
    return NextResponse.json(
      { error: "insufficient pot tokens remaining" },
      { status: 402 },
    );
  }

  const streams = await listStreamsBySlug(params.slug);
  if (streams.length === 0) {
    return NextResponse.json({ error: "no streams available" }, { status: 404 });
  }

  const cleanedMessage = clean_stream_message(incoming);
  const sessionSuffix = sessionId ? sessionId.slice(-4) : "anon";
  const userUname = `user-${sessionSuffix}`;
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const tasks = streams.map(async (stream) => {
        const llm = stream.llm as LlmName;
        await createStreamMessage(
          stream.id,
          "user",
          sessionId,
          userUname,
          cleanedMessage,
        );

        const historyRows = await listStreamMessages(stream.id);
        const history = historyRows.map((row) => ({
          role: row.role,
          content: row.content,
        }));

        const result = streamText({
          model: getLlmModel(llm),
          system: clean_stream_message(
            build_stream_system_prompt(stub, stream.canon),
          ),
          messages: history,
        });

        let fullText = "";
        for await (const chunk of result.textStream) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ llm, type: "delta", chunk })}\n`),
          );
        }

        const processed = await postprocess(params.slug, stream.id, fullText);
        await createStreamMessage(stream.id, "assistant", sessionId, llm, processed);
        controller.enqueue(
          encoder.encode(`${JSON.stringify({ llm, type: "done" })}\n`),
        );
      });

      try {
        await Promise.all(tasks);
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : String(error),
            })}\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
