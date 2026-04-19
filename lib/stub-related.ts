import type { StubRecord } from "@/lib/data/providers/types";

function prependParentIf(
  similar: StubRecord[],
  parent: StubRecord | null,
  includeParent: (s: StubRecord) => boolean,
): StubRecord[] {
  const out = [...similar];
  if (parent && includeParent(parent) && !out.some((s) => s.id === parent.id)) {
    out.unshift(parent);
  }
  return out.slice(0, 10);
}

/**
 * Builds “Things we know” / “Things we don’t yet know” from similarity search only,
 * optionally prepending the parent stub when `current.parent_id` is set (if it matches
 * each panel’s status rules).
 */
export async function buildRelatedQuestionLists(
  current: StubRecord,
  similarMatches: StubRecord[],
  getStubById: (id: string) => Promise<StubRecord | null>,
): Promise<{ know: StubRecord[]; dontKnow: StubRecord[] }> {
  const pool = similarMatches.filter((s) => s.slug !== current.slug);

  let parent: StubRecord | null = null;
  if (current.parent_id) {
    parent = await getStubById(current.parent_id);
    if (parent && parent.id === current.id) parent = null;
  }

  const knowSimilar = pool.filter((s) => s.status === "seeded" || s.status === "approved");
  const dontSimilar = pool.filter((s) => s.status === "biddable");

  const know = prependParentIf(knowSimilar, parent, (s) =>
    Boolean(s.status === "seeded" || s.status === "approved"),
  );

  const dontKnow = prependParentIf(dontSimilar, parent, (s) => s.status === "biddable");

  return { know, dontKnow };
}
