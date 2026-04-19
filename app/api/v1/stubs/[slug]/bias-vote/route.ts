import { NextResponse } from "next/server";
import { incrementStubBiasVoteRecord } from "@/lib/data/provider";
import { isBiasVoteAxis } from "@/lib/data/providers/types";

type Body = {
  axis?: string;
};

export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const axisRaw = (body.axis ?? "").trim().toLowerCase();
  if (!isBiasVoteAxis(axisRaw)) {
    return NextResponse.json(
      { error: "axis must be left, center, or right" },
      { status: 400 },
    );
  }

  try {
    const updated = await incrementStubBiasVoteRecord(params.slug, axisRaw);
    if (!updated) {
      return NextResponse.json({ error: "Stub not found" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[bias-vote]", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
