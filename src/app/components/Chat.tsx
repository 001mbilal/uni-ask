"use client";

import { useEffect, useRef, useState } from "react";

type Uni = { id: string; name: string; city: string; chunks: number };
type Source = {
  n: number;
  universityId: string;
  universityName: string;
  title: string;
  url: string;
  fetchedAt: string;
  cited: boolean;
};
type Msg = { role: "user" | "assistant"; content: string; sources?: Source[]; error?: boolean };

const EXAMPLES = [
  "What is the fee structure for BS Computer Science at FAST?",
  "NUST admission test kab hota hai?",
  "Which universities offer need-based scholarships?",
  "LUMS aur IBA ke BBA admission requirements compare karo",
];

export default function Chat({ universities, empty }: { universities: Uni[]; empty: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
          universityIds: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages([...next, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (e) {
      setMessages([
        ...next,
        { role: "assistant", content: (e as Error).message, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4">
      <header className="py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Ask Universities</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Admissions, fees, programs and scholarships at Pakistani universities. Answers come only
          from official university pages, with links. Ask in English, Urdu or Roman Urdu.
        </p>
      </header>

      {empty && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          Nothing is indexed yet. Run <code>npm run crawl</code> then <code>npm run embed</code>,
          and reload this page.
        </div>
      )}

      <div className="mb-3">
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="text-sm text-[var(--accent)] underline-offset-2 hover:underline"
        >
          {selected.length
            ? `Searching ${selected.length} selected ${selected.length === 1 ? "university" : "universities"}`
            : "Searching all universities"}{" "}
          ({showFilter ? "hide" : "change"})
        </button>
        {showFilter && (
          <div className="mt-2 flex flex-wrap gap-2">
            {universities.map((u) => (
              <button
                key={u.id}
                onClick={() => toggle(u.id)}
                title={u.name}
                className={`rounded-full border px-3 py-1 text-xs ${
                  selected.includes(u.id)
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-white hover:border-[var(--accent)]"
                }`}
              >
                {u.id.toUpperCase()}
              </button>
            ))}
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="text-xs text-[var(--muted)] underline">
                clear
              </button>
            )}
          </div>
        )}
      </div>

      <main className="flex-1 space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => send(e)}
                disabled={empty}
                className="rounded-lg border border-[var(--line)] bg-white p-3 text-left text-sm hover:border-[var(--accent)] disabled:opacity-50"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              dir="auto"
              className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : m.error
                  ? "border border-red-300 bg-red-50 text-red-900"
                  : "border border-[var(--line)] bg-white"
              }`}
            >
              {m.content}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3 text-xs" dir="ltr">
                  <div className="font-medium text-[var(--muted)]">Sources</div>
                  {m.sources
                    .filter((s) => s.cited)
                    .map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded border border-[var(--line)] px-2 py-1.5 hover:border-[var(--accent)]"
                      >
                        <span className="font-medium">[{s.n}]</span> {s.universityId.toUpperCase()} ·{" "}
                        {s.title}
                        <span className="block truncate text-[var(--muted)]">
                          {s.url} · fetched {s.fetchedAt.slice(0, 10)}
                        </span>
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && <div className="text-sm text-[var(--muted)]">Searching official pages...</div>}
        <div ref={bottom} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 bg-[var(--bg)] pb-4 pt-2"
      >
        <div className="flex gap-2">
          <input
            dir="auto"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about admissions, fees, scholarships..."
            className="flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[15px] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || empty}
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            Ask
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-[var(--muted)]">
          Unofficial tool. Always confirm fees, deadlines and requirements with the university.
        </p>
      </form>
    </div>
  );
}
