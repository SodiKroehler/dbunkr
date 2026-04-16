import { NextResponse } from "next/server";
import { applyStubVoteRecord } from "@/lib/data/provider";
import { isStubVoteType } from "@/lib/data/providers/types";

type VoteBody = {
  stubId?: string;
  voteType?: string;
};

export async function POST(request: Request) {
  let body: VoteBody;
  try {
    body = (await request.json()) as VoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const stubId = (body.stubId ?? "").trim();
  const voteTypeRaw = (body.voteType ?? "").trim();

  if (!stubId) {
    return NextResponse.json({ error: "stubId is required" }, { status: 400 });
  }
  if (!isStubVoteType(voteTypeRaw)) {
    return NextResponse.json(
      { error: "voteType must be close_forward, importance_forward, or importance_backward" },
      { status: 400 },
    );
  }

  try {
    const updated = await applyStubVoteRecord(stubId, voteTypeRaw);
    if (!updated) {
      return NextResponse.json({ error: "Stub not found" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[vote]", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
