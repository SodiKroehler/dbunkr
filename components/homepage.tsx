"use client";

import { WendellVines } from "@/lib/wendell_v2/WendellVines";

export function Homepage() {
  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      <div className="wendell-vine-host absolute inset-0">
        <WendellVines />
      </div>

      <section className="relative z-10 flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-4">
        <h1
          className="mb-6 text-5xl font-bold tracking-tight"
          style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
        >
          dbunkr
        </h1>

        <input
          type="search"
          aria-label="Search"
          placeholder="Search"
          className="w-full max-w-2xl rounded-full border border-neutral-300 bg-white px-6 py-4 text-base text-black shadow-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />

        <div className="mt-6 flex items-center justify-center gap-4">
          <button className="rounded-md border border-neutral-300 bg-white px-5 py-2 text-sm text-black hover:bg-neutral-100">
            Search
          </button>
          <button className="rounded-md border border-neutral-300 bg-white px-5 py-2 text-sm text-black hover:bg-neutral-100">
            Research
          </button>
        </div>
      </section>
    </main>
  );
}
