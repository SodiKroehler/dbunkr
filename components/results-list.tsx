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
    <section className="rounded-sm border border-stone-200 bg-stone-50 px-6 py-5">
      <h2
        className="mb-4 text-xs uppercase tracking-[0.18em] text-stone-500"
        style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
      >
        Streams
      </h2>
      {stubs.length === 0 ? (
        <p className="text-sm text-stone-500">No stubs yet.</p>
      ) : (
        stubs.map((stub) => (
          <article
            key={stub.id}
            className="border-t border-stone-300 py-4 first:border-t-0"
          >
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-lg leading-relaxed text-stone-900">{stub.rq}</h3>
                <p className="text-[15px] leading-7 text-stone-700">{stub.blurb ?? ""}</p>
              </div>
              <time className="shrink-0 pt-1 text-xs text-stone-500">
                {new Date(stub.created_at).toLocaleDateString()}
              </time>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
