import { Stream } from "@/components/stream";
import { listStubRecords } from "@/lib/data/provider";

export default async function RiverPage() {
  const stubs = await listStubRecords();
  const [left, right] = stubs.slice(0, 2);

  return (
    <main className="min-h-[calc(100vh-72px)] px-6 py-8 bg-neutral-100">
      <h1 className="mb-6 text-2xl font-semibold text-dark-900">River</h1>

      {left && right ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Stream slug={left.slug} llm="claude" />
          <Stream slug={right.slug} llm="grok" />
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Add at least two stubs in the database to render the river.
        </p>
      )}
    </main>
  );
}
