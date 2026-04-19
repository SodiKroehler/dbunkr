import type { StubRecord } from "@/lib/data/providers/types";

/** Split semantic-search matches into “settled” vs “still open” buckets for sidebar links. */
export function partitionRelatedQuestions(
  stubs: StubRecord[],
  excludeSlug: string,
): { know: StubRecord[]; dontKnow: StubRecord[] } {
  const others = stubs.filter((s) => s.slug !== excludeSlug);
  return {
    know: others.filter((s) => s.status === "seeded" || s.status === "approved").slice(0, 10),
    dontKnow: others.filter((s) => s.status === "biddable" || s.status === "proposed").slice(0, 10),
  };
}
