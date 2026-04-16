import { listStubRecords } from "@/lib/data/provider";

export async function GET() {
  const stubs = await listStubRecords();
  return Response.json({ data: stubs });
}

async function match(_query: string) {
  return listStubRecords();
}

export async function POST(request: Request) {
  const body = (await request.json()) as { query?: string };
  const query = body.query ?? "";
  const stubs = await match(query);
  return Response.json({ data: stubs });
}
