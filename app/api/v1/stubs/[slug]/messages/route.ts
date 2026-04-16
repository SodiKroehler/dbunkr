import { emptyItemResponse, emptyListResponse } from "@/lib/api/empty";

export async function GET() {
  return emptyListResponse();
}

export async function POST() {
  return emptyItemResponse();
}
