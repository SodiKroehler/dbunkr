"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { StubRecord } from "@/lib/data/providers/types";

export function ResultsList({
  initialStubs,
  useSessionCache = true,
}: {
  initialStubs: StubRecord[];
  useSessionCache?: boolean;
}) {
  const router = useRouter();
  const [stubs, setStubs] = useState<StubRecord[]>(initialStubs);
  const [query, setQuery] = useState("");
  const [askOpen, setAskOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  useEffect(() => {
    if (!useSessionCache) return;
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
  }, [useSessionCache]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stubs;
    return stubs.filter(
      (s) =>
        s.rq.toLowerCase().includes(q) ||
        (s.blurb ?? "").toLowerCase().includes(q),
    );
  }, [stubs, query]);

  async function submitNewQuestion() {
    const rq = newQuestion.trim();
    if (!rq || submitting) return;
    setSubmitting(true);
    setAskError(null);
    try {
      const response = await fetch("/api/v1/stubs/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rq }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setAskError(body.error ?? "Could not create stub.");
        return;
      }
      const payload = (await response.json()) as { data?: StubRecord };
      const stub = payload.data;
      if (!stub?.slug) {
        setAskError("Invalid response from server.");
        return;
      }
      setAskOpen(false);
      setNewQuestion("");
      router.push(`/stub/${encodeURIComponent(stub.slug)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter results…"
          aria-label="Filter results"
          className="w-full flex-1 border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
        <button
          type="button"
          onClick={() => {
            setAskOpen(true);
            setAskError(null);
          }}
          className="shrink-0 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
        >
          Ask a new question
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {stubs.length === 0 ? "No stubs yet." : "No matching stubs."}
        </p>
      ) : (
        filtered.map((stub) => (
          <article key={stub.id} className="py-1">
            <Link href={`/stub/${stub.slug}`} className="block rounded hover:bg-neutral-50">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1">
                  <h3 className="text-base font-medium text-neutral-900">{stub.rq}</h3>
                  <p className="text-sm text-neutral-600">{stub.blurb ?? ""}</p>
                </div>
                <time className="shrink-0 pt-1 text-xs text-neutral-400">
                  {stub.status === "biddable" ? (
                    <span className="mb-1 inline-block rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                      open
                    </span>
                  ) : null}
                  <br />
                  {new Date(stub.created_at).toLocaleDateString()}
                </time>
              </div>
            </Link>
          </article>
        ))
      )}

      {askOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ask-new-title"
            className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg"
          >
            <h2 id="ask-new-title" className="text-lg font-semibold text-neutral-900">
              Ask a new question
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Your question becomes a new research stub. Only the question text is saved.
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitNewQuestion();
              }}
            >
              <textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Type your question…"
                rows={4}
                className="w-full resize-y rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                autoFocus
              />
              {askError ? <p className="text-sm text-red-600">{askError}</p> : null}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAskOpen(false);
                    setNewQuestion("");
                    setAskError(null);
                  }}
                  className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newQuestion.trim()}
                  className="rounded bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  {submitting ? "Creating…" : "Create stub"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
