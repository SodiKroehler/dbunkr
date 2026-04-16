import { listStubRecords } from "@/lib/data/provider";
import { ResultsList } from "@/components/results-list";

export default async function ResultsPage() {
  const stubs = await listStubRecords();

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-8 py-10">
      <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold text-neutral-900">Results</h1>
      <ResultsList initialStubs={stubs} />
      </div>
    </main>
  );
}
