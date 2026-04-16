import { listStubRecords } from "@/lib/data/provider";

export default async function ResultsPage() {
  const stubs = await listStubRecords();

  return (
    <main className="min-h-[calc(100vh-72px)] px-8 py-10">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold">Results</h1>

        {stubs.length === 0 ? (
          <p className="text-sm text-neutral-500">No stubs yet.</p>
        ) : (
          stubs.map((stub) => (
            <article
              key={stub.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <h2 className="text-lg font-medium">{stub.rq}</h2>
                  <p className="text-sm text-neutral-600">{stub.blurb ?? ""}</p>
                  <p className="text-xs uppercase tracking-wide text-neutral-400">
                    {stub.slug}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-neutral-400">
                  {new Date(stub.created_at).toLocaleDateString()}
                </time>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
