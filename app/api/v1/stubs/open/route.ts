import { NextResponse } from "next/server";
import { listOpenStubRecords } from "@/lib/data/provider";

export async function GET() {
  const stubs = await listOpenStubRecords();
  return NextResponse.json({ data: stubs });
}
