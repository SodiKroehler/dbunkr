"use client";

import { useState } from "react";
import { Stream } from "@/components/stream";

type RiverViewProps = {
  slug: string;
};

async function sendToRiver(
  slug: string,
  message: string,
  onChunk: (llm: "claude" | "grok", chunk: string) => void,
) {
  const response = await fetch(`/api/v1/river/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send to river ${slug}.`);
  }

  if (!response.body) {
    await response.text();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const evt = JSON.parse(line) as {
        llm?: "claude" | "grok";
        type: "delta" | "done" | "error";
        chunk?: string;
      };
      if (evt.type === "delta" && evt.llm && evt.chunk) {
        onChunk(evt.llm, evt.chunk);
      }
    }
  }
}

export function RiverView({ slug }: RiverViewProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveUserMessage, setLiveUserMessage] = useState<string | null>(null);
  const [liveAssistantByLlm, setLiveAssistantByLlm] = useState<
    Record<"claude" | "grok", string>
  >({
    claude: "",
    grok: "",
  });

  async function onSend() {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      setLiveUserMessage(trimmed);
      setLiveAssistantByLlm({ claude: "", grok: "" });
      await sendToRiver(slug, trimmed, (llm, chunk) => {
        setLiveAssistantByLlm((prev) => ({
          ...prev,
          [llm]: `${prev[llm]}${chunk}`,
        }));
      });
      setMessage("");
      setLiveUserMessage(null);
      setLiveAssistantByLlm({ claude: "", grok: "" });
      setRefreshKey((prev) => prev + 1);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Stream
          slug={slug}
          llm="claude"
          refreshKey={refreshKey}
          liveUserMessage={liveUserMessage}
          liveAssistantMessage={liveAssistantByLlm.claude}
        />
        <Stream
          slug={slug}
          llm="grok"
          refreshKey={refreshKey}
          liveUserMessage={liveUserMessage}
          liveAssistantMessage={liveAssistantByLlm.grok}
        />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSend();
        }}
        className="mt-6 flex gap-2"
      >
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
          placeholder="speak ur truth sista"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-black hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </>
  );
}
