"use client";

import type { StubRecord } from "@/lib/data/providers/types";

export function BiddableStub({
  stub,
  selected,
  onExpand,
}: {
  stub: StubRecord;
  selected: boolean;
  onExpand: (stub: StubRecord) => void;
}) {
  return (
    <article
      className={`relative rounded-lg border p-4 ${
        selected ? "border-blue-500 bg-blue-50" : "border-neutral-200 bg-white"
      }`}
    >
      <h3 className="text-base font-semibold text-neutral-900">{stub.rq}</h3>
      <p className="mt-1 line-clamp-3 text-sm text-neutral-600">{stub.blurb ?? ""}</p>
      <p className="mt-3 text-xs text-neutral-400">
        {new Date(stub.created_at).toLocaleDateString()}
      </p>

      <button
        type="button"
        onClick={() => onExpand(stub)}
        aria-label={`Expand ${stub.rq}`}
        className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-lg leading-none text-neutral-700 hover:bg-neutral-100"
      >
        +
      </button>
    </article>
  );
}
