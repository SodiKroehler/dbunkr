"use client";

import { useEffect, useMemo, useState } from "react";

type StreamMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type StreamPayload = {
  stream: {
    id: string;
    stub_slug: string;
    llm: "claude" | "grok";
  } | null;
  canon: Array<{ role: string; content: string }>;
  messages: StreamMessage[];
};

export function Stream({
  slug,
  llm = "claude",
  refreshKey = 0,
}: {
  slug: string;
  llm?: "claude" | "grok";
  refreshKey?: number;
}) {
  const [messages, setMessages] = useState<StreamMessage[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const response = await fetch(`/api/v1/streams/${slug}/messages?llm=${llm}`, {
        signal: controller.signal,
      });
      const body = (await response.json()) as { data: StreamPayload };
      setMessages(body.data.messages ?? []);
    }
    void load();
    return () => controller.abort();
  }, [slug, llm, refreshKey]);

  const title = useMemo(() => `${slug} (${llm})`, [slug, llm]);

  return (
    <section className="flex h-[70vh] flex-col rounded-lg border border-neutral-200 bg-white p-4 text-black">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black">{title}</h2>

      <div className="flex-1 space-y-2 overflow-y-auto rounded border border-neutral-200 p-3 text-black">
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm text-black">
            <span className="mr-2 font-semibold uppercase">{msg.role}:</span>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
