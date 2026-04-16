import { readFile } from "node:fs/promises";
import path from "node:path";

export default async function AboutPage() {
  const filePath = path.join(process.cwd(), "lib", "about.txt");
  const body = (await readFile(filePath, "utf8")).trim();

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white px-8 py-10">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">README</h2>
          <p className="mt-6 text-xl leading-relaxed text-neutral-800">{body}</p>
        </section>

        <section className="flex flex-wrap justify-center gap-10 lg:justify-end">
          <ContributionBar label="Site contributions" level={0} accent="bg-blue-500" />
          <ContributionBar label="Research contributions" level={0} accent="bg-emerald-500" />
        </section>
      </div>
    </main>
  );
}

function ContributionBar({
  label,
  level,
  accent,
}: {
  label: string;
  level: number;
  accent: string;
}) {
  const pct = Math.max(0, Math.min(100, level));

  return (
    <div className="flex w-36 flex-col items-center gap-3">
      <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-800">
        {label}
      </h3>
      <div className="relative h-72 w-14 overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100 shadow-inner">
        <div
          className={`absolute bottom-0 left-0 right-0 ${accent} transition-[height] duration-300`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <p className="text-3xl font-semibold tabular-nums text-neutral-900">{level}</p>
    </div>
  );
}
