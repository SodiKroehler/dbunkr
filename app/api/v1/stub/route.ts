import { NextResponse } from "next/server";
import { createDataProvider } from "@/lib/data/provider";

type CreateStubBody = {
  rq?: string;
  type?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateStubBody;
  const rq = (body.rq ?? "").trim();

  if (!rq) {
    return NextResponse.json({ error: "rq is required" }, { status: 400 });
  }

  const provider = createDataProvider();
  const base = slugify(rq) || "proposed-rq";
  const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
  const status = body.type === "proposed" ? "proposed" : "proposed";

  const stub = await provider.createStubRecord({
    slug,
    rq,
    status,
  });

  return NextResponse.json({ data: stub }, { status: 201 });
}
