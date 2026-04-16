import { NextResponse } from "next/server";
import { applyBidVoteRecord } from "@/lib/data/provider";
import { isBidVoteDirection } from "@/lib/data/providers/types";

type Body = {
  bidId?: string;
  direction?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bidId = (body.bidId ?? "").trim();
  const directionRaw = (body.direction ?? "").trim().toLowerCase();

  if (!bidId) {
    return NextResponse.json({ error: "bidId is required" }, { status: 400 });
  }
  if (!isBidVoteDirection(directionRaw)) {
    return NextResponse.json(
      { error: "direction must be \"up\" or \"down\"" },
      { status: 400 },
    );
  }

  try {
    const updated = await applyBidVoteRecord(bidId, directionRaw);
    if (!updated) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[voteBid]", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
