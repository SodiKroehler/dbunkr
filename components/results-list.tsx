"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StubRecord } from "@/lib/data/providers/types";

export function ResultsList({ initialStubs }: { initialStubs: StubRecord[] }) {
  const [stubs, setStubs] = useState<StubRecord[]>(initialStubs);

  useEffect(() => {
    const raw = sessionStorage.getItem("results:stubs");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as StubRecord[];
      if (Array.isArray(parsed)) {
        setStubs(parsed);
      }
    } catch {
      // Ignore malformed payload and keep server-provided data.
    }
  }, []);

  return (
    <section className="space-y-3">
      {stubs.length === 0 ? (
        <p className="text-sm text-neutral-500">No stubs yet.</p>
      ) : (
        stubs.map((stub) => (
          <article key={stub.id} className="py-1">
            <Link href={`/stub/${stub.slug}`} className="block rounded hover:bg-neutral-50">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-base font-medium text-neutral-900">{stub.rq}</h3>
                <p className="text-sm text-neutral-600">{stub.blurb ?? ""}</p>
              </div>
              <time className="shrink-0 pt-1 text-xs text-neutral-400">
                {new Date(stub.created_at).toLocaleDateString()}
              </time>
            </div>
            </Link>
          </article>
        ))
      )}
    </section>
  );
}
