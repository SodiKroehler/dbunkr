import { RiverView } from "@/components/river-view";
import { listStubRecords } from "@/lib/data/provider";

export default async function RiverPage() {
  const stubs = await listStubRecords();
  const [stub] = stubs;

  return (
    <main className="min-h-[calc(100vh-72px)] px-6 py-8 bg-neutral-100">
      <h1 className="mb-6 text-2xl font-semibold text-dark-900">River</h1>

      {stub ? (
        <RiverView slug={stub.slug} />
      ) : (
        <p className="text-sm text-neutral-500">
          Add at least one stub in the database to render the river.
        </p>
      )}
    </main>
  );
}
