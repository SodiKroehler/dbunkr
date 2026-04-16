import { RiverView } from "@/components/river-view";
import { getStubBySlug } from "@/lib/data/provider";

export default async function RiverBySlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const stub = await getStubBySlug(params.slug);

  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-8">
      {stub ? (
        <RiverView slug={params.slug} />
      ) : (
        <p className="text-sm text-neutral-500">Stub not found.</p>
      )}
    </main>
  );
}
