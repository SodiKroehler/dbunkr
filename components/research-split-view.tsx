"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BidRecord, StubRecord, StubVoteType } from "@/lib/data/providers/types";
import { BiddableStub } from "@/components/biddable-stub";

const emptyBidForm = {
  orcid: "",
  name: "",
  website: "",
  pitch: "",
};

const bidFieldClass =
  "mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400";

export function ResearchSplitView({ stubs }: { stubs: StubRecord[] }) {
  const [localStubs, setLocalStubs] = useState<StubRecord[]>(stubs);
  const [selectedId, setSelectedId] = useState<string | null>(stubs[0]?.id ?? null);
  const [votePending, setVotePending] = useState(false);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [bidForm, setBidForm] = useState(emptyBidForm);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidVotePendingId, setBidVotePendingId] = useState<string | null>(null);
  const bidModalBackdropMouseDown = useRef(false);

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

  useEffect(() => {
    if (!selected?.id) {
      setBids([]);
      return;
    }

    let cancelled = false;
    setBidsLoading(true);
    fetch(`/api/v1/bids?stubId=${encodeURIComponent(selected.id)}`)
      .then((r) => r.json())
      .then((body: { data?: BidRecord[] }) => {
        if (!cancelled && Array.isArray(body.data)) {
          setBids(body.data);
        }
      })
      .catch(() => {
        if (!cancelled) setBids([]);
      })
      .finally(() => {
        if (!cancelled) setBidsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

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

  async function submitBid(e: FormEvent) {
    e.preventDefault();
    if (!selected || bidSubmitting) return;
    const orcid = bidForm.orcid.trim();
    if (!orcid) return;

    setBidSubmitting(true);
    try {
      const response = await fetch("/api/v1/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stubId: selected.id,
          orcid,
          name: bidForm.name.trim() || undefined,
          website: bidForm.website.trim() || null,
          pitch: bidForm.pitch.trim() || undefined,
        }),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: BidRecord };
      const bid = payload.data;
      if (!bid) return;
      setBids((prev) => [bid, ...prev]);
      setBidModalOpen(false);
      setBidForm({ ...emptyBidForm });
    } finally {
      setBidSubmitting(false);
    }
  }

  async function postBidVote(bidId: string, direction: "up" | "down") {
    if (bidVotePendingId) return;
    setBidVotePendingId(bidId);
    try {
      const response = await fetch("/api/v1/voteBid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId, direction }),
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: BidRecord };
      const updated = payload.data;
      if (!updated) return;
      setBids((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    } finally {
      setBidVotePendingId(null);
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

            <div className="border-t border-neutral-200 pt-4">
              <h2 className="text-lg font-semibold text-neutral-900">Bids</h2>
              <div className="relative mt-3 min-h-[4.5rem] pb-12">
                {bidsLoading ? (
                  <p className="text-xs text-neutral-500">Loading bids…</p>
                ) : bids.length === 0 ? (
                  <p className="text-xs text-neutral-500">No bids yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {bids.map((b) => (
                      <li
                        key={b.id}
                        className="flex gap-3 rounded-md border border-neutral-100 bg-neutral-50/90 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-neutral-900">{b.name || "—"}</div>
                          <div className="mt-1 text-xs text-neutral-600">ORCID: {b.orcid}</div>
                          {b.website ? (
                            <a
                              href={b.website.startsWith("http") ? b.website : `https://${b.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block text-xs text-blue-600 hover:underline"
                            >
                              {b.website}
                            </a>
                          ) : null}
                          {b.pitch ? (
                            <p className="mt-2 text-xs leading-relaxed text-neutral-700">{b.pitch}</p>
                          ) : null}
                          <div className="mt-2 flex gap-3 text-xs text-neutral-500">
                            <span>For: {b.votes_for}</span>
                            <span>Against: {b.votes_against}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-center justify-center gap-1 self-stretch">
                          <button
                            type="button"
                            aria-label="Vote for this bid"
                            disabled={bidVotePendingId !== null}
                            onClick={() => void postBidVote(b.id, "up")}
                            className="rounded border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label="Vote against this bid"
                            disabled={bidVotePendingId !== null}
                            onClick={() => void postBidVote(b.id, "down")}
                            className="rounded border border-neutral-300 px-2 py-1 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                          >
                            ↓
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  aria-label="Add bid"
                  onClick={() => {
                    setBidForm({ ...emptyBidForm });
                    setBidModalOpen(true);
                  }}
                  className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-lg font-light leading-none text-neutral-700 shadow-sm hover:bg-neutral-50"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>

      {bidModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-neutral-900"
          role="presentation"
          onMouseDown={(e) => {
            bidModalBackdropMouseDown.current = e.target === e.currentTarget;
          }}
          onMouseUp={(e) => {
            if (bidModalBackdropMouseDown.current && e.target === e.currentTarget) {
              setBidModalOpen(false);
            }
            bidModalBackdropMouseDown.current = false;
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bid-modal-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-neutral-200 bg-white p-5 text-neutral-900 shadow-lg"
          >
            <h3 id="bid-modal-title" className="text-lg font-semibold text-neutral-900">
              New bid
            </h3>
            <p className="mt-1 text-xs text-neutral-600">
              ORCID is required; other fields are optional.
            </p>
            <form onSubmit={(e) => void submitBid(e)} className="mt-4 space-y-3">
              <div>
                <label htmlFor="bid-orcid" className="text-xs font-medium text-neutral-800">
                  ORCID
                </label>
                <input
                  id="bid-orcid"
                  value={bidForm.orcid}
                  onChange={(e) => setBidForm((f) => ({ ...f, orcid: e.target.value }))}
                  className={bidFieldClass}
                  placeholder="0000-0002-1825-0097"
                  required
                />
              </div>
              <div>
                <label htmlFor="bid-name" className="text-xs font-medium text-neutral-800">
                  Name
                </label>
                <input
                  id="bid-name"
                  value={bidForm.name}
                  onChange={(e) => setBidForm((f) => ({ ...f, name: e.target.value }))}
                  className={bidFieldClass}
                />
              </div>
              <div>
                <label htmlFor="bid-website" className="text-xs font-medium text-neutral-800">
                  Website
                </label>
                <input
                  id="bid-website"
                  value={bidForm.website}
                  onChange={(e) => setBidForm((f) => ({ ...f, website: e.target.value }))}
                  className={bidFieldClass}
                  placeholder="https://"
                />
              </div>
              <div>
                <label htmlFor="bid-pitch" className="text-xs font-medium text-neutral-800">
                  Pitch
                </label>
                <textarea
                  id="bid-pitch"
                  value={bidForm.pitch}
                  onChange={(e) => setBidForm((f) => ({ ...f, pitch: e.target.value }))}
                  rows={4}
                  className={bidFieldClass}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBidModalOpen(false)}
                  className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bidSubmitting}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {bidSubmitting ? "Saving…" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
