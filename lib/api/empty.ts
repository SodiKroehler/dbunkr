import { NextResponse } from "next/server";

export function emptyListResponse() {
  return NextResponse.json({ data: [] });
}

export function emptyItemResponse() {
  return NextResponse.json({ data: null });
}
