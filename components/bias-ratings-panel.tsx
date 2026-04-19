"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StubRecord } from "@/lib/data/providers/types";

type Axis = "left" | "center" | "right";

export function BiasRatingsPanel({
  slug,
  initialLeft,
  initialCenter,
  initialRight,
  showOverallSummary = true,
  onStubUpdated,
}: {
  slug: string;
  initialLeft: number;
  initialCenter: number;
  initialRight: number;
  /** When false, hides the numeric “overall confidence” row (e.g. when shown next to the user truth scale). */
  showOverallSummary?: boolean;
  /** Called after a successful bias vote with the updated stub row. */
  onStubUpdated?: (stub: StubRecord) => void;
}) {
  const [left, setLeft] = useState(initialLeft);
  const [center, setCenter] = useState(initialCenter);
  const [right, setRight] = useState(initialRight);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    setLeft(initialLeft);
    setCenter(initialCenter);
    setRight(initialRight);
  }, [initialLeft, initialCenter, initialRight]);

  const overallConfidence = useMemo(
    () => Math.round((left + center + right) / 3),
    [left, center, right],
  );

  const vote = useCallback(async (axis: Axis) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      const res = await fetch(`/api/v1/stubs/${encodeURIComponent(slug)}/bias-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ axis }),
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { data?: StubRecord };
      const s = payload.data;
      if (!s) return;
      setLeft(s.left_truth);
      setCenter(s.center_truth);
      setRight(s.right_truth);
      onStubUpdated?.(s);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [slug, onStubUpdated]);

  return (
    <>
      <div className="space-y-3 text-sm">
        <BiasBar
          label="Left-Leaning Users"
          value={left}
          fillClass="bg-blue-500"
          disabled={pending}
          onVote={() => void vote("left")}
        />
        <BiasBar
          label="Moderate Users"
          value={center}
          fillClass="bg-emerald-500"
          disabled={pending}
          onVote={() => void vote("center")}
        />
        <BiasBar
          label="Right-Leaning Users"
          value={right}
          fillClass="bg-red-500"
          disabled={pending}
          onVote={() => void vote("right")}
        />
      </div>

      {showOverallSummary ? (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <div className="flex items-center justify-between text-sm text-neutral-700">
            <span>overall confidence</span>
            <span>{overallConfidence}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

function BiasBar({
  label,
  value,
  fillClass,
  disabled,
  onVote,
}: {
  label: string;
  value: number;
  fillClass: string;
  disabled: boolean;
  onVote: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onVote}
      className="w-full cursor-pointer rounded-md p-1 text-left transition-colors hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-60"
      aria-label={`Vote ${label}: add one to ${label} bias score`}
    >
      <div className="mb-1 flex justify-between text-neutral-700">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 w-full rounded bg-neutral-200">
        <div className={`h-2 rounded ${fillClass}`} style={{ width: `${value}%` }} />
      </div>
    </button>
  );
}
