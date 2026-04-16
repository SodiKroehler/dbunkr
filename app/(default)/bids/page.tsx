import { listStubRecords } from "@/lib/data/provider";

export default async function BidsPage() {
  const stubs = await listStubRecords();

  return (
    <main className="min-h-[calc(100vh-72px)] px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-semibold">Bids</h1>

        {stubs.length === 0 ? (
          <p className="text-sm text-neutral-500">No stubs available.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 border-b border-neutral-200 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              <span>Slug</span>
              <span>Research Question</span>
              <span>Status</span>
              <span>Created</span>
            </div>

            {stubs.map((stub) => (
              <div
                key={stub.id}
                className="grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 border-b border-neutral-100 px-4 py-4 text-sm last:border-b-0"
              >
                <span className="font-medium">{stub.slug}</span>
                <span className="text-neutral-600">{stub.rq}</span>
                <span>{stub.status}</span>
                <span>{new Date(stub.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
