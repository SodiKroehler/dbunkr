import Link from "next/link";
import type { StubRecord } from "@/lib/data/providers/types";
import { normalizeExternalHref, parseRelatedLinkUrls } from "@/lib/related-links";

export function RelatedLinksPanel({ csv }: { csv: string | null }) {
  const urls = parseRelatedLinkUrls(csv);

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-neutral-800">
        Related Links
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {urls.length === 0 ? (
          <p className="text-sm text-neutral-500">None listed.</p>
        ) : (
          <ul className="space-y-2">
            {urls.map((url, i) => {
              const href = normalizeExternalHref(url);
              const label = url.length > 72 ? `${url.slice(0, 70)}…` : url;
              return (
                <li key={`${href}-${i}`}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-sm text-blue-600 hover:underline"
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function RelatedQuestionsPanel({
  know,
  dontKnow,
}: {
  know: StubRecord[];
  dontKnow: StubRecord[];
}) {
  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-neutral-800">
        Related Questions
      </h2>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <StubLinkTile
          title="Things we know"
          stubs={know}
          emptyCopy="No related settled stubs yet."
        />
        <StubLinkTile
          title="Things we don't yet know"
          stubs={dontKnow}
          emptyCopy="No open related stubs yet."
        />
      </div>
    </div>
  );
}

function StubLinkTile({
  title,
  stubs,
  emptyCopy,
}: {
  title: string;
  stubs: StubRecord[];
  emptyCopy: string;
}) {
  return (
    <div className="flex min-h-[100px] flex-1 flex-col rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-700">
        {title}
      </h3>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {stubs.length === 0 ? (
          <p className="text-xs text-neutral-500">{emptyCopy}</p>
        ) : (
          <ul className="space-y-1.5">
            {stubs.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stub/${encodeURIComponent(s.slug)}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {s.rq}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
