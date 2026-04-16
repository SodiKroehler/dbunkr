import { NextResponse } from "next/server";
import { getStreamBySlug } from "@/lib/data/provider";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const stream = await getStreamBySlug(params.slug);

  if (!stream) {
    return NextResponse.json({ data: null }, { status: 404 });
  }

  return NextResponse.json({ data: stream });
}
