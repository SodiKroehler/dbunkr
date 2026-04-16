"use client";

import { useEffect, useMemo, useState } from "react";
import type { StubRecord, StubVoteType } from "@/lib/data/providers/types";
import { BiddableStub } from "@/components/biddable-stub";

export function ResearchSplitView({ stubs }: { stubs: StubRecord[] }) {
  const [localStubs, setLocalStubs] = useState<StubRecord[]>(stubs);
  const [selectedId, setSelectedId] = useState<string | null>(stubs[0]?.id ?? null);
  const [votePending, setVotePending] = useState(false);

  useEffect(() => {
    setLocalStubs(stubs);
    setSelectedId((prev) => {
      if (prev && stubs.some((s) => s.id === prev)) return prev;
      return stubs[0]?.id ?? null;
    });
  }, [stubs]);

  const selected = useMemo(
    () => localStubs.find((stub) => stub.id === selectedId) ?? localStubs[0] ?? null,
    [localStubs, selectedId],
  );

  async function postVote(voteType: StubVoteType) {
    if (!selected || votePending) return;
    setVotePending(true);
    try {
      const response = await fetch("/api/v1/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stubId: selected.id, voteType }),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: StubRecord };
      const updated = payload.data;
      if (!updated) return;
      setLocalStubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } finally {
      setVotePending(false);
    }
  }

  if (stubs.length === 0) {
    return <p className="text-sm text-neutral-500">No open research questions yet.</p>;
  }

  return (
    <section className="grid h-[calc(100vh-160px)] min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
      <div className="overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="grid gap-3">
          {localStubs.map((stub) => (
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
                <dt className="text-neutral-500">Slug</dt>
                <dd className="text-neutral-800">{selected.slug}</dd>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <dt className="text-neutral-500">Status</dt>
                <dd className="text-neutral-800">{selected.status}</dd>
              </div>
            </dl>

            <div className="space-y-3 pt-2">
              <div className="rounded-md border border-neutral-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  This issue should be closed
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-2xl font-semibold text-neutral-900">{selected.close_votes}</span>
                  <button
                    type="button"
                    aria-label="Upvote close votes"
                    disabled={votePending}
                    onClick={() => void postVote("close_forward")}
                    className="rounded border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    ↑
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                  Importance level
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-2xl font-semibold text-neutral-900">
                    {selected.importance_level}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label="Upvote importance level"
                      disabled={votePending}
                      onClick={() => void postVote("importance_forward")}
                      className="rounded border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="Downvote importance level"
                      disabled={votePending}
                      onClick={() => void postVote("importance_backward")}
                      className="rounded border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </section>
  );
}
