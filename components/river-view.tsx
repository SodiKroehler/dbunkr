"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stream } from "@/components/stream";
import { triggerNovelResearchQuestionProcess } from "@/lib/processes/novel-rq";

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
        evt.user_message
      ) {
        onUnrelated({
          llm: evt.llm,
          stream_id: evt.stream_id,
          response: evt.response ?? "",
          user_message: evt.user_message,
          suggestions: evt.suggestions ?? [],
        });
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
  const [novelModal, setNovelModal] = useState<{
    userMessage: string;
  } | null>(null);
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
      setLiveNovelByLlm({ claude: false, grok: false });
      let hadUnrelated = false;
      let novelFlowHandled = false;

      const openNovelQuestionFlow = (userMessage: string) => {
        if (novelFlowHandled) return;
        novelFlowHandled = true;
        setUnrelatedModal(null);
        queueMicrotask(() => {
          setNovelModal({ userMessage });
          void triggerNovelResearchQuestionProcess(userMessage);
        });
      };

      const riverResult = await sendToRiver(
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
          const emptyAssistant = !payload.response.trim();
          const noSimilarRqs = payload.suggestions.length === 0;

          if (emptyAssistant || noSimilarRqs) {
            openNovelQuestionFlow(payload.user_message);
            return;
          }

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

      if (riverResult === "pot_blocked") {
        setPotDepleted(true);
        return;
      }
      if (riverResult === "error") {
        throw new Error(`Failed to send to river ${slug}.`);
      }

      setMessage("");
      if (!hadUnrelated && !novelFlowHandled) {
        setLiveUserMessage(null);
        setLiveAssistantByLlm({ claude: "", grok: "" });
        setLiveNovelByLlm({ claude: false, grok: false });
        setRefreshKey((prev) => prev + 1);
      }
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

      {novelModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 60 }).map((_, idx) => (
              <span
                key={`confetti-${idx}`}
                className="absolute h-2 w-2 rounded-sm opacity-80 animate-[fall_2.8s_linear_infinite]"
                style={{
                  left: `${(idx * 17) % 100}%`,
                  top: "-8px",
                  backgroundColor: ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"][idx % 4],
                  animationDelay: `${(idx % 10) * 0.15}s`,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 w-full max-w-xl rounded-lg bg-white p-6 text-black shadow-lg">
            <h3 className="text-lg font-semibold">You asked a novel question!</h3>
            <p className="mt-3 text-sm text-neutral-700">
              User request: {novelModal.userMessage}
            </p>
            <button
              type="button"
              onClick={() => {
                setNovelModal(null);
                setLiveUserMessage(null);
                setLiveAssistantByLlm({ claude: "", grok: "" });
                setLiveNovelByLlm({ claude: false, grok: false });
                setRefreshKey((prev) => prev + 1);
              }}
              className="mt-5 rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-12px) rotate(0deg);
          }
          100% {
            transform: translateY(120vh) rotate(540deg);
          }
        }
      `}</style>
    </div>
  );
}
