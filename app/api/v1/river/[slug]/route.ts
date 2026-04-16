import { streamText } from "ai";
import { NextResponse } from "next/server";
import {
  chargeSitePotFromMessage,
  createStreamMessage,
  getPotState,
  getStubBySlug,
  listStreamMessages,
  listStreamsBySlug,
} from "@/lib/data/provider";
import { sitePotCostFromMessage } from "@/lib/pot/site-cost";
import { match } from "@/lib/match";
import { getLlmModel, type LlmName } from "@/lib/llm/provider";
import { build_stream_system_prompt } from "@/lib/prompts";
import {
  clean_stream_message,
  createAssistantPublicStreamFilter,
  postprocess,
} from "@/lib/stream/processing";

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

  const { site } = await getPotState();
  const siteCost = sitePotCostFromMessage(incoming);
  if (!site || site.tokens_remaining < siteCost) {
    return NextResponse.json(
      { error: "insufficient pot tokens remaining" },
      { status: 402 },
    );
  }

  await chargeSitePotFromMessage(incoming);

  const streams = await listStreamsBySlug(params.slug);
  if (streams.length === 0) {
    return NextResponse.json({ error: "no streams available" }, { status: 404 });
  }

  const cleanedMessage = incoming;
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
          "ephemeral",
          cleanedMessage,
        );

        const historyRows = await listStreamMessages(stream.id);
        const history = historyRows.map((row) => ({
          role: row.role,
          content: row.content,
        }));

        const result = streamText({
          model: getLlmModel(llm),
          system: build_stream_system_prompt(stub, stream.canon, cleanedMessage),
          messages: history,
        });

        const streamFilter = createAssistantPublicStreamFilter();
        for await (const chunk of result.textStream) {
          const toClient = streamFilter.push(chunk);
          if (toClient) {
            controller.enqueue(
              encoder.encode(`${JSON.stringify({ llm, type: "delta", chunk: toClient })}\n`),
            );
          }
        }
        const tail = streamFilter.finalize();
        if (tail) {
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ llm, type: "delta", chunk: tail })}\n`),
          );
        }

        const fullText = streamFilter.accumulated;
        const cleanedOutput = clean_stream_message(fullText);

        if (cleanedOutput.tag === "unrelated") {
          const matches = await match(cleanedMessage);
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                llm,
                type: "unrelated",
                stream_id: stream.id,
                response: cleanedOutput.content,
                user_message: cleanedMessage,
                suggestions: matches.slice(0, 3).map((stubMatch) => ({
                  slug: stubMatch.slug,
                  rq: stubMatch.rq,
                })),
              })}\n`,
            ),
          );
          return;
        }

        const processed = await postprocess(
          params.slug,
          stream.id,
          cleanedOutput.content,
        );
        const messageType = cleanedOutput.tag === "unseen" ? "proposed" : "ephemeral";
        await createStreamMessage(
          stream.id,
          "assistant",
          sessionId,
          llm,
          messageType,
          processed,
        );
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              llm,
              type: "done",
              novel: cleanedOutput.tag === "unseen",
            })}\n`,
          ),
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
