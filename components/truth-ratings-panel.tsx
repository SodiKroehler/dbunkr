"use client";

import { useMemo, useState } from "react";
import { BiasRatingsPanel } from "@/components/bias-ratings-panel";
import type { StubRecord } from "@/lib/data/providers/types";

function TruthScale({ title, value }: { title: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="flex min-h-[120px] flex-1 flex-col justify-center rounded-md border border-neutral-200 bg-white px-3 py-4 shadow-sm">
      <h3 className="mb-4 text-center text-sm font-semibold text-neutral-900">{title}</h3>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="w-10 shrink-0 text-xs leading-snug text-neutral-600 sm:w-10">
          not at all true
        </span>
        <div className="relative h-12 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-emerald-600 to-emerald-500 transition-[width] duration-300 ease-out"
            style={{ width: `${v}%` }}
          />
        </div>
        <span className="w-10 shrink-0 text-right text-xs leading-snug text-neutral-600 sm:w-10">
          entirely true
        </span>
      </div>
    </div>
  );
}

export function TruthRatingsPanel({
  slug,
  initialLeft,
  initialCenter,
  initialRight,
  officialTruth,
}: {
  slug: string;
  initialLeft: number;
  initialCenter: number;
  initialRight: number;
  officialTruth: number;
}) {
  const [left, setLeft] = useState(initialLeft);
  const [center, setCenter] = useState(initialCenter);
  const [right, setRight] = useState(initialRight);

  const userConsensus = useMemo(
    () => Math.round((left + center + right) / 3),
    [left, center, right],
  );

  const syncFromVote = (record: StubRecord) => {
    setLeft(record.left_truth);
    setCenter(record.center_truth);
    setRight(record.right_truth);
  };

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-neutral-800">
        Truth-Ratings
      </h2>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <TruthScale title="What our Users think" value={userConsensus} />
        <TruthScale title="What Other Sites Say" value={officialTruth} />
      </div>

      <div className="mt-4 shrink-0 border-t border-neutral-200 pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600">
          User bias votes
        </p>
        <BiasRatingsPanel
          slug={slug}
          initialLeft={left}
          initialCenter={center}
          initialRight={right}
          showOverallSummary={false}
          onStubUpdated={syncFromVote}
        />
      </div>
    </div>
  );
}
