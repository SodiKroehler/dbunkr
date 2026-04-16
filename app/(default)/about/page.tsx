import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPotState } from "@/lib/data/provider";

const TOKEN_CEILING = 2_000_000;
const TOKEN_STEP = 100_000;
const DOLLAR_MIN = 1000;
const DOLLAR_MAX = 2000;
const DOLLAR_STEP = 100;

const VENMO_SITE =
"https://account.venmo.com/u/Sodi-Kroehler?txn=pay&amount=5&note=dbunkr+site+contribution";
const VENMO_RESEARCH =
  "https://account.venmo.com/u/Sodi-Kroehler?txn=pay&amount=5&note=dbunkr+research+contribution";

export default async function AboutPage() {
  const filePath = path.join(process.cwd(), "lib", "about.txt");
  const body = (await readFile(filePath, "utf8")).trim();

  let siteTokens = 100_000;
  let researchDollars = 0;
  try {
    const pot = await getPotState();
    siteTokens = pot.site?.tokens_remaining ?? 100_000;
    researchDollars = pot.research?.tokens_remaining ?? 0;
  } catch {
    // keep defaults if DB unavailable
  }

  return (
    <main className="min-h-[calc(100vh-72px)] bg-white">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">README</h2>
          <p className="mt-6 text-xl leading-relaxed text-neutral-800">{body}</p>
        </section>
      </div>

      <section className="w-full border-t border-neutral-200 bg-neutral-50/60 px-6 py-10 sm:px-10">
        <div className="mx-auto grid min-h-[min(72vh,820px)] w-full max-w-none grid-cols-1 gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
          <SiteTokenVial tokens={siteTokens} />
          <ResearchDollarVial dollars={researchDollars} />
        </div>
      </section>
    </main>
  );
}

function formatTokenAxisLabel(value: number): string {
  if (value === 0) return "0";
  if (value === 1_000_000) return "1M";
  if (value === 2_000_000) return "2M";
  return `${value / 1000}k`;
}

function formatUsdAxisLabel(value: number): string {
  return `$${(value / 1000).toFixed(1)}k`.replace(/\.0k$/, "k");
}

function SiteTokenVial({ tokens }: { tokens: number }) {
  const clamped = Math.max(0, Math.min(TOKEN_CEILING, tokens));
  const fillPct = TOKEN_CEILING > 0 ? (clamped / TOKEN_CEILING) * 100 : 0;
  const ticks: number[] = [];
  for (let t = 0; t <= TOKEN_CEILING; t += TOKEN_STEP) {
    ticks.push(t);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-full max-w-md">
        <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-800">
          Site contributions
        </h3>
        <p className="mt-1 text-center text-xs text-neutral-500">
          Scale: tokens · 0 – 2,000,000 · marks every 100,000
        </p>
      </div>

      <div className="relative mt-4 flex w-full flex-1 justify-center px-4">
        <div className="relative h-[min(65vh,760px)] w-14 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              className="pointer-events-none absolute right-full mr-2 whitespace-nowrap text-[10px] tabular-nums text-neutral-500"
              style={{
                bottom: `${(t / TOKEN_CEILING) * 100}%`,
                transform: "translateY(50%)",
              }}
            >
              {formatTokenAxisLabel(t)}
            </span>
          ))}
          <div className="absolute inset-0 overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100 shadow-inner">
            <div
              className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-[height] duration-300"
              style={{ height: `${fillPct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-2xl font-semibold tabular-nums text-neutral-900">
        {clamped.toLocaleString("en-US")}{" "}
        <span className="text-base font-normal text-neutral-600">tokens</span>
      </p>
      <a
        href={VENMO_SITE}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Contribute 3M tokens to the site
      </a>
    </div>
  );
}

function ResearchDollarVial({ dollars }: { dollars: number }) {
  const span = DOLLAR_MAX - DOLLAR_MIN;
  const raw = dollars;
  const fillPct =
    raw <= DOLLAR_MIN ? 0 : raw >= DOLLAR_MAX ? 100 : ((raw - DOLLAR_MIN) / span) * 100;
  const ticks: number[] = [];
  for (let d = DOLLAR_MIN; d <= DOLLAR_MAX; d += DOLLAR_STEP) {
    ticks.push(d);
  }

  return (
    <div className="flex w-full flex-col items-center border-t border-neutral-200 pt-10 md:border-l md:border-t-0 md:pt-0 md:pl-16 lg:pl-24">
      <div className="w-full max-w-md">
        <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-neutral-800">
          Research contributions
        </h3>
        <p className="mt-1 text-center text-xs text-neutral-500">
          Scale: US dollars · $1,000 – $2,000 · marks every $100 (not token units)
        </p>
      </div>

      <div className="relative mt-4 flex w-full flex-1 justify-center px-4">
        <div className="relative h-[min(65vh,760px)] w-14 shrink-0">
          <div className="absolute inset-0 overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100 shadow-inner">
            <div
              className="absolute bottom-0 left-0 right-0 bg-emerald-500 transition-[height] duration-300"
              style={{ height: `${fillPct}%` }}
            />
          </div>
          {ticks.map((d) => (
            <span
              key={d}
              className="pointer-events-none absolute left-full ml-2 whitespace-nowrap text-[10px] tabular-nums text-neutral-500"
              style={{
                bottom: `${((d - DOLLAR_MIN) / span) * 100}%`,
                transform: "translateY(50%)",
              }}
            >
              {formatUsdAxisLabel(d)}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-2xl font-semibold tabular-nums text-neutral-900">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(raw)}
      </p>
      <a
        href={VENMO_RESEARCH}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
      >
        Contribute 5$ to the top rated research question
      </a>
    </div>
  );
}
