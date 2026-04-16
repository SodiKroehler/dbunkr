"use client";

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
    <>
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
    </>
  );
}
