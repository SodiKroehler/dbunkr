import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createDataProvider } from "@/lib/data/provider";

type Body = {
  rq?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rq = (body.rq ?? "").trim();
  if (!rq) {
    return NextResponse.json({ error: "rq is required" }, { status: 400 });
  }

  try {
    const provider = createDataProvider();
    const slug = `USER_CREATED_${randomUUID()}`;
    const stub = await provider.createStubRecord({
      slug,
      rq,
      status: "proposed",
    });
    return NextResponse.json({ data: stub }, { status: 201 });
  } catch (error) {
    console.error("[stubs/ask]", error);
    return NextResponse.json({ error: "Failed to create stub" }, { status: 500 });
  }
}
