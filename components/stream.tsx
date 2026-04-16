"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

export function Stream({ slug, llm = "claude" }: { slug: string; llm?: "claude" | "grok" }) {
  const [streamId, setStreamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const response = await fetch(`/api/v1/streams/${slug}/messages`, {
        signal: controller.signal,
      });
      const body = (await response.json()) as { data: StreamPayload };
      setStreamId(body.data.stream?.id ?? null);
      setMessages(body.data.messages ?? []);
    }
    void load();
    return () => controller.abort();
  }, [slug]);

  const title = useMemo(() => `${slug} (${llm})`, [slug, llm]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isStreaming) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      },
    ]);
    setIsStreaming(true);

    const response = await fetch(`/api/v1/streams/${slug}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, llm }),
    });

    if (!response.ok || !response.body) {
      setIsStreaming(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      },
    ]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          last.content = assistantText;
        }
        return copy;
      });
    }

    setIsStreaming(false);

    if (streamId) {
      const refresh = await fetch(`/api/v1/streams/${slug}/messages`);
      const body = (await refresh.json()) as { data: StreamPayload };
      setMessages(body.data.messages ?? []);
    }
  }

  return (
    <section className="flex h-[70vh] flex-col rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-dark-900">{title}</h2>

      <div className="mb-3 flex-1 space-y-2 overflow-y-auto rounded border border-neutral-200 p-3">
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="mr-2 font-semibold uppercase">{msg.role}:</span>
            <span>{msg.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Send message to stream..."
        />
        <button
          type="submit"
          disabled={isStreaming}
          className="rounded border border-neutral-300 px-4 py-2 text-sm"
        >
          {isStreaming ? "Streaming..." : "Send"}
        </button>
      </form>
    </section>
  );
}
