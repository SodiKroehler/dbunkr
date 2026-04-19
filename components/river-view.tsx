"use client";

import { useEffect, useState } from "react";
import { Stream } from "@/components/stream";

type RiverViewProps = {
  slug: string;
  className?: string;
};

async function sendToRiver(
  slug: string,
  message: string,
  sessionId: string,
  onChunk: (llm: "claude" | "grok", chunk: string) => void,
): Promise<"ok" | "pot_blocked" | "error"> {
  const response = await fetch(`/api/v1/river/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (response.status === 402) {
    return "pot_blocked";
  }

  if (!response.ok) {
    return "error";
  }

  if (!response.body) {
    await response.text();
    return "ok";
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

  return "ok";
}

export function RiverView({ slug, className }: RiverViewProps) {
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
  const [potDepleted, setPotDepleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/pot")
      .then((r) => r.json())
      .then((body: { data?: { site?: { tokens_remaining?: number } } }) => {
        if (cancelled) return;
        const t = body.data?.site?.tokens_remaining;
        setPotDepleted(t !== undefined && t <= 0);
      })
      .catch(() => {
        if (!cancelled) setPotDepleted(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function onSend() {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    const sessionId =
      localStorage.getItem("session_id") ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2));
    localStorage.setItem("session_id", sessionId);

    setSending(true);
    try {
      setLiveUserMessage(trimmed);
      setLiveAssistantByLlm({ claude: "", grok: "" });

      const riverResult = await sendToRiver(slug, trimmed, sessionId, (llm, chunk) => {
        setLiveAssistantByLlm((prev) => ({
          ...prev,
          [llm]: `${prev[llm]}${chunk}`,
        }));
      });

      if (riverResult === "pot_blocked") {
        setPotDepleted(true);
        return;
      }
      if (riverResult === "error") {
        throw new Error(`Failed to send to river ${slug}.`);
      }

      setMessage("");
      setLiveUserMessage(null);
      setLiveAssistantByLlm({ claude: "", grok: "" });
      setRefreshKey((prev) => prev + 1);
      void fetch("/api/v1/pot")
        .then((r) => r.json())
        .then((body: { data?: { site?: { tokens_remaining?: number } } }) => {
          const t = body.data?.site?.tokens_remaining;
          setPotDepleted(t !== undefined && t <= 0);
        })
        .catch(() => {});
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-2">
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

      {potDepleted ? (
        <p className="mt-3 shrink-0 text-center text-sm italic text-amber-900">
          Please make a site contribution to get the LLM&apos;s working again!
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSend();
        }}
        className="mt-4 flex shrink-0 gap-2"
      >
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-black"
          placeholder="ask anything on this topic!"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded border border-neutral-300 bg-white px-4 py-2 text-sm text-black hover:bg-neutral-100 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
