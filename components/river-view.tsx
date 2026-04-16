"use client";

import { useState } from "react";
import { Stream } from "@/components/stream";

type RiverViewProps = {
  slug: string;
};

async function sendToStream(slug: string, llm: "claude" | "grok", message: string) {
  const response = await fetch(`/api/v1/streams/${slug}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, llm }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send to stream ${slug} (${llm}).`);
  }

  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } else {
    await response.text();
  }
}

export function RiverView({ slug }: RiverViewProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function onSend() {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await Promise.all([
        sendToStream(slug, "claude", trimmed),
        sendToStream(slug, "grok", trimmed),
      ]);
      setMessage("");
      setRefreshKey((prev) => prev + 1);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Stream slug={slug} llm="claude" refreshKey={refreshKey} />
        <Stream slug={slug} llm="grok" refreshKey={refreshKey} />
      </div>

      <div className="mt-6 flex gap-2">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
          placeholder="speak ur truth sista"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-black hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </>
  );
}
