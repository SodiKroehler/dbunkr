import { RiverView } from "@/components/river-view";
import Link from "next/link";
import { getStubBySlug } from "@/lib/data/provider";
import { match } from "@/lib/match";

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

  const overallConfidence = Math.round(
    (stub.left_truth + stub.center_truth + stub.right_truth) / 3,
  );
  const similarOpenStubs = (await match(stub.rq))
    .filter((candidate) => candidate.slug !== stub.slug && candidate.status === "biddable")
    .slice(0, 3);

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-8 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <section className="grid min-h-[26vh] gap-6 lg:grid-cols-[1.8fr_1fr]">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold text-neutral-900">{stub.rq}</h1>
            <p className="text-base leading-7 text-neutral-700">{stub.blurb ?? ""}</p>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
                Related Links
              </h2>
              <a
                href="https://google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                https://google.com
              </a>
            </div>

            <p className="text-xs tracking-wide text-neutral-400">{params.slug}</p>
          </div>

          <aside className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-800">
              Crowd-Sourced Bias Ratings
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-1 flex justify-between text-neutral-700">
                  <span>left</span>
                  <span>{stub.left_truth}</span>
                </div>
                <div className="h-2 w-full rounded bg-neutral-200">
                  <div className="h-2 rounded bg-blue-500" style={{ width: `${stub.left_truth}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-neutral-700">
                  <span>center</span>
                  <span>{stub.center_truth}</span>
                </div>
                <div className="h-2 w-full rounded bg-neutral-200">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${stub.center_truth}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-neutral-700">
                  <span>right</span>
                  <span>{stub.right_truth}</span>
                </div>
                <div className="h-2 w-full rounded bg-neutral-200">
                  <div className="h-2 rounded bg-red-500" style={{ width: `${stub.right_truth}%` }} />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-neutral-200 pt-3">
              <div className="flex items-center justify-between text-sm text-neutral-700">
                <span>overall confidence</span>
                <span>{overallConfidence}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
                What We Don&apos;t Know
              </h3>
              <div className="min-h-16 rounded border border-dashed border-neutral-300 bg-white p-2">
                {similarOpenStubs.length === 0 ? (
                  <p className="text-xs text-neutral-500">No open related stubs yet.</p>
                ) : (
                  <div className="space-y-1">
                    {similarOpenStubs.map((candidate) => (
                      <Link
                        key={candidate.id}
                        href={`/stub/${candidate.slug}`}
                        className="block text-xs text-blue-600 hover:underline"
                      >
                        {candidate.rq}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="h-[58vh] min-h-[320px]">
          <RiverView slug={params.slug} className="h-full" />
        </section>
      </div>
    </main>
  );
}
