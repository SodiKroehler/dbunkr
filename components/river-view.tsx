"use client";

import { useState } from "react";
import Link from "next/link";
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
  onDone: (llm: "claude" | "grok", novel: boolean) => void,
  onUnrelated: (payload: {
    llm: "claude" | "grok";
    stream_id: string;
    response: string;
    user_message: string;
    suggestions: Array<{ slug: string; rq: string }>;
  }) => void,
) {
  const response = await fetch(`/api/v1/river/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
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
        type: "delta" | "done" | "error" | "unrelated";
        chunk?: string;
        stream_id?: string;
        response?: string;
        user_message?: string;
        suggestions?: Array<{ slug: string; rq: string }>;
        novel?: boolean;
      };
      if (evt.type === "delta" && evt.llm && evt.chunk) {
        onChunk(evt.llm, evt.chunk);
      }
      if (evt.type === "done" && evt.llm) {
        onDone(evt.llm, Boolean(evt.novel));
      }
      if (
        evt.type === "unrelated" &&
        evt.llm &&
        evt.stream_id &&
        evt.response &&
        evt.user_message
      ) {
        onUnrelated({
          llm: evt.llm,
          stream_id: evt.stream_id,
          response: evt.response,
          user_message: evt.user_message,
          suggestions: evt.suggestions ?? [],
        });
      }
    }
  }
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
  const [liveNovelByLlm, setLiveNovelByLlm] = useState<
    Record<"claude" | "grok", boolean>
  >({
    claude: false,
    grok: false,
  });
  const [unrelatedModal, setUnrelatedModal] = useState<{
    userMessage: string;
    entries: Array<{ llm: "claude" | "grok"; stream_id: string; response: string }>;
    suggestions: Array<{ slug: string; rq: string }>;
  } | null>(null);

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
      setLiveNovelByLlm({ claude: false, grok: false });
      let hadUnrelated = false;
      await sendToRiver(
        slug,
        trimmed,
        sessionId,
        (llm, chunk) => {
          setLiveAssistantByLlm((prev) => ({
            ...prev,
            [llm]: `${prev[llm]}${chunk}`,
          }));
        },
        (llm, novel) => {
          setLiveNovelByLlm((prev) => ({ ...prev, [llm]: novel }));
        },
        (payload) => {
          hadUnrelated = true;
          setUnrelatedModal((prev) => {
            const existingEntries = prev?.entries ?? [];
            const exists = existingEntries.some(
              (entry) => entry.llm === payload.llm && entry.stream_id === payload.stream_id,
            );
            const nextEntries = exists
              ? existingEntries
              : [...existingEntries, { llm: payload.llm, stream_id: payload.stream_id, response: payload.response }];
            return {
              userMessage: payload.user_message,
              entries: nextEntries,
              suggestions: payload.suggestions,
            };
          });
        },
      );
      setMessage("");
      if (!hadUnrelated) {
        setLiveUserMessage(null);
        setLiveAssistantByLlm({ claude: "", grok: "" });
        setLiveNovelByLlm({ claude: false, grok: false });
        setRefreshKey((prev) => prev + 1);
      }
    } finally {
      setSending(false);
    }
  }

  async function acceptUnrelated() {
    if (!unrelatedModal) return;
    const sessionId = localStorage.getItem("session_id");
    await fetch(`/api/v1/river/${slug}/accept-unrelated`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        entries: unrelatedModal.entries,
      }),
    });
    setUnrelatedModal(null);
    setLiveUserMessage(null);
    setLiveAssistantByLlm({ claude: "", grok: "" });
    setLiveNovelByLlm({ claude: false, grok: false });
    setRefreshKey((prev) => prev + 1);
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
          liveNovel={liveNovelByLlm.claude}
        />
        <Stream
          slug={slug}
          llm="grok"
          refreshKey={refreshKey}
          liveUserMessage={liveUserMessage}
          liveAssistantMessage={liveAssistantByLlm.grok}
          liveNovel={liveNovelByLlm.grok}
        />
      </div>

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

      {unrelatedModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 text-black">
            <h3 className="text-lg font-semibold">This seems unrelated to the RQ.</h3>
            <p className="mt-3 text-sm">
              <span className="font-semibold">User request:</span> {unrelatedModal.userMessage}
            </p>
            <div className="mt-4 space-y-3">
              {unrelatedModal.entries.map((entry) => (
                <div key={`${entry.llm}-${entry.stream_id}`} className="rounded border border-neutral-200 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase">{entry.llm}</p>
                  <p className="text-sm">{entry.response}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Similar RQs</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {unrelatedModal.suggestions.slice(0, 3).map((item) => (
                  <Link
                    key={item.slug}
                    href={`/stub/${item.slug}`}
                    className="rounded border border-neutral-300 p-2 text-sm hover:bg-neutral-50"
                  >
                    {item.rq}
                  </Link>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={acceptUnrelated}
              className="mt-6 text-xs text-neutral-500 hover:text-neutral-700"
            >
              No, this is related
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
