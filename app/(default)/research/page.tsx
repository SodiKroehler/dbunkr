import { ResultsList } from "@/components/results-list";
import { listOpenStubRecords } from "@/lib/data/provider";

export default async function ResearchPage() {
  const stubs = await listOpenStubRecords();

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-8 py-10">
      <div className="max-w-4xl space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Research</h1>
        <ResultsList initialStubs={stubs} useSessionCache={false} />
      </div>
    </main>
  );
}
