import { NextResponse } from "next/server";
import { chargeSitePotFromMessage, getPotState } from "@/lib/data/provider";
import { sitePotCostFromMessage } from "@/lib/pot/site-cost";

export async function GET() {
  try {
    const data = await getPotState();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[pot GET]", error);
    return NextResponse.json({ error: "Failed to read pot" }, { status: 500 });
  }
}

type PostBody = {
  message?: string;
};

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const { site } = await getPotState();
    const cost = sitePotCostFromMessage(message);
    if (!site || site.tokens_remaining < cost) {
      return NextResponse.json(
        { error: "insufficient pot tokens remaining" },
        { status: 402 },
      );
    }

    const updated = await chargeSitePotFromMessage(message);
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[pot POST]", error);
    return NextResponse.json({ error: "Failed to update site pot" }, { status: 500 });
  }
}
