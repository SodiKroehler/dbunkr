"use client";

import { useMemo, useState } from "react";
import type { StubRecord } from "@/lib/data/providers/types";
import { BiddableStub } from "@/components/biddable-stub";

export function ResearchSplitView({ stubs }: { stubs: StubRecord[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(stubs[0]?.id ?? null);

  const selected = useMemo(
    () => stubs.find((stub) => stub.id === selectedId) ?? stubs[0] ?? null,
    [stubs, selectedId],
  );

  if (stubs.length === 0) {
    return <p className="text-sm text-neutral-500">No open research questions yet.</p>;
  }

  return (
    <section className="grid h-[calc(100vh-160px)] min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="grid gap-3">
          {stubs.map((stub) => (
            <BiddableStub
              key={stub.id}
              stub={stub}
              selected={selected?.id === stub.id}
              onExpand={(picked) => setSelectedId(picked.id)}
            />
          ))}
        </div>
      </div>

      <aside className="overflow-y-auto rounded-lg border border-neutral-200 bg-white p-5">
        {selected ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-neutral-900">{selected.rq}</h2>
            <p className="text-sm text-neutral-600">{selected.blurb ?? ""}</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <dt className="text-neutral-500">Date</dt>
                <dd className="text-neutral-800">
                  {new Date(selected.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <dt className="text-neutral-500">Type</dt>
                <dd className="text-neutral-800">{selected.type ?? "n/a"}</dd>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <dt className="text-neutral-500">Slug</dt>
                <dd className="text-neutral-800">{selected.slug}</dd>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <dt className="text-neutral-500">Status</dt>
                <dd className="text-neutral-800">{selected.status}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
