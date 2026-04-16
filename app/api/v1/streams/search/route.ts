import { NextResponse } from "next/server";
import { searchStreams } from "@/lib/data/provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stream_id = searchParams.get("stream_id") ?? undefined;
  const slug_id = searchParams.get("slug_id") ?? undefined;
  const river = searchParams.get("river") ?? undefined;

  const data = await searchStreams({ stream_id, slug_id, river });
  return NextResponse.json({ data });
}
