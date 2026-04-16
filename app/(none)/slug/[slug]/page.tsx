import { OpenRiverLink } from "@/components/open-river-link";
import { getStubBySlug } from "@/lib/data/provider";

function getBiasValuesFromSlug(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) % 9973;
  }
  return {
    left: (hash * 13) % 101,
    moderate: (hash * 29 + 7) % 101,
    right: (hash * 47 + 3) % 101,
  };
}

export default async function SlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const stub = await getStubBySlug(params.slug);
  const bias = getBiasValuesFromSlug(params.slug);

  return (
    <main className="min-h-screen bg-white px-8 py-10">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.8fr_1fr]">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold text-neutral-900">
            {stub?.rq ?? "Unknown research question"}
          </h1>
          <p className="text-base leading-7 text-neutral-700">{stub?.blurb ?? ""}</p>

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
          <OpenRiverLink slug={params.slug} />
        </section>

        <aside className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-800">
            Crowd-Sourced Bias Ratings
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <div className="mb-1 flex justify-between text-neutral-700">
                <span>left</span>
                <span>{bias.left}</span>
              </div>
              <div className="h-2 w-full rounded bg-neutral-200">
                <div
                  className="h-2 rounded bg-blue-500"
                  style={{ width: `${bias.left}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-neutral-700">
                <span>moderate</span>
                <span>{bias.moderate}</span>
              </div>
              <div className="h-2 w-full rounded bg-neutral-200">
                <div
                  className="h-2 rounded bg-emerald-500"
                  style={{ width: `${bias.moderate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-neutral-700">
                <span>right</span>
                <span>{bias.right}</span>
              </div>
              <div className="h-2 w-full rounded bg-neutral-200">
                <div
                  className="h-2 rounded bg-red-500"
                  style={{ width: `${bias.right}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">
              What We Don&apos;t Know
            </h3>
            <div className="min-h-16 rounded border border-dashed border-neutral-300 bg-white" />
          </div>
        </aside>
      </div>
    </main>
  );
}
