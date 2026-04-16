import { NextResponse } from "next/server";
import { createBidRecord, listBidsForStub } from "@/lib/data/provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stubId = (searchParams.get("stubId") ?? "").trim();

  if (!stubId) {
    return NextResponse.json({ error: "stubId query parameter is required" }, { status: 400 });
  }

  try {
    const data = await listBidsForStub(stubId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[bids GET]", error);
    return NextResponse.json({ error: "Failed to list bids" }, { status: 500 });
  }
}

type PostBody = {
  stubId?: string;
  orcid?: string;
  name?: string;
  website?: string | null;
  pitch?: string;
  votes_for?: number;
  votes_against?: number;
};

export async function POST(request: Request) {
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const stubId = (body.stubId ?? "").trim();
  const orcid = (body.orcid ?? "").trim();

  if (!stubId) {
    return NextResponse.json({ error: "stubId is required" }, { status: 400 });
  }
  if (!orcid) {
    return NextResponse.json({ error: "orcid is required" }, { status: 400 });
  }

  try {
    const bid = await createBidRecord({
      stub_id: stubId,
      orcid,
      name: body.name,
      website: body.website,
      pitch: body.pitch,
      votes_for: body.votes_for,
      votes_against: body.votes_against,
    });
    return NextResponse.json({ data: bid }, { status: 201 });
  } catch (error) {
    console.error("[bids POST]", error);
    return NextResponse.json({ error: "Failed to create bid" }, { status: 500 });
  }
}
