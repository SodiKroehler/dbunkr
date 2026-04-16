import { NextResponse } from "next/server";
import { getPot } from "@/lib/data/provider";

export async function GET() {
  const pot = await getPot();
  return NextResponse.json({ data: pot });
}
