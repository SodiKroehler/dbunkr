import Link from "next/link";
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
        <div className="space-y-4">
          <Link
            href={`/slug/${params.slug}`}
            className="inline-block text-2xl font-semibold text-neutral-900 hover:underline"
          >
            {stub.rq}
          </Link>
          <RiverView slug={params.slug} />
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Stub not found.</p>
      )}
    </main>
  );
}
