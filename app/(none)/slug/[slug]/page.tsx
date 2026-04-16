import Link from "next/link";
import { getStubBySlug } from "@/lib/data/provider";

export default async function SlugPage({
  params,
}: {
  params: { slug: string };
}) {
  const stub = await getStubBySlug(params.slug);

  return (
    <main className="min-h-screen bg-white px-8 py-10">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-900">{params.slug}</h1>
        <p className="text-base text-neutral-700">{stub?.blurb ?? ""}</p>
        <Link
          href={`/river/${params.slug}`}
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          Open river
        </Link>
      </div>
    </main>
  );
}
