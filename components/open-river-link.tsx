"use client";

import Link from "next/link";

function ensureSessionId() {
  const existing = localStorage.getItem("session_id");
  if (existing) return existing;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  localStorage.setItem("session_id", next);
  return next;
}

export function OpenRiverLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/river/${slug}`}
      onClick={() => {
        ensureSessionId();
      }}
      className="inline-block text-sm text-blue-600 hover:underline"
    >
      Open river
    </Link>
  );
}
