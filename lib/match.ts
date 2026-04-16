import { matchStubRecords } from "@/lib/data/provider";

export async function match(query: string) {
  return matchStubRecords(query);
}
