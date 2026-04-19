import { RiverView } from "@/components/river-view";
import { RelatedLinksPanel, RelatedQuestionsPanel } from "@/components/stub-summary-row";
import { TruthRatingsPanel } from "@/components/truth-ratings-panel";
import { getStubById, getStubBySlug } from "@/lib/data/provider";
import { match } from "@/lib/match";
import { buildRelatedQuestionLists } from "@/lib/stub-related";

export default async function StubPage({
  params,
}: {
  params: { slug: string };
}) {
  const stub = await getStubBySlug(params.slug);

  if (!stub) {
    return (
      <main className="min-h-screen bg-white px-8 py-10">
        <p className="text-sm text-neutral-500">Stub not found.</p>
      </main>
    );
  }

  const matched = await match(stub.rq);
  const { know, dontKnow } = await buildRelatedQuestionLists(stub, matched, getStubById);

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-8 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="min-w-0 flex-1 text-3xl font-semibold text-neutral-900">{stub.rq}</h1>
            <span
              className="pointer-events-none shrink-0 select-none rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-sm font-semibold text-neutral-900"
              aria-label={
                stub.status === "biddable"
                  ? "Research question is open"
                  : "Research question is closed"
              }
            >
              {stub.status === "biddable" ? "open" : "closed"}
            </span>
          </div>
          <p className="text-base leading-7 text-neutral-700">{stub.blurb ?? ""}</p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6 lg:items-stretch">
            <RelatedLinksPanel csv={stub.related_links} />
            <TruthRatingsPanel
              slug={params.slug}
              initialLeft={stub.left_truth}
              initialCenter={stub.center_truth}
              initialRight={stub.right_truth}
              officialTruth={stub.official_truth}
            />
            <RelatedQuestionsPanel know={know} dontKnow={dontKnow} />
          </div>

          <p className="text-xs tracking-wide text-neutral-400">{params.slug}</p>
        </section>

        <section className="h-[58vh] min-h-[320px]">
          <RiverView slug={params.slug} className="h-full" />
        </section>
      </div>
    </main>
  );
}
