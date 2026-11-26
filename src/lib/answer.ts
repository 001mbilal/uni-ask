import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";
import { UNIVERSITIES } from "./universities";
import { search, type Hit } from "./retrieve";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Source = {
  n: number;
  universityId: string;
  universityName: string;
  title: string;
  url: string;
  fetchedAt: string;
  cited: boolean;
};

export type ChatResult = {
  answer: string;
  sources: Source[];
  searchQuery: string;
};

let _client: Anthropic | null = null;
function client() {
  if (!config.anthropicKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return (_client ??= new Anthropic({ apiKey: config.anthropicKey }));
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

type Analysis = { searchQuery: string; universityIds: string[] };

/**
 * One cheap call that (1) turns the latest question into a standalone English
 * search query, which helps with Urdu and Roman Urdu, and (2) spots which
 * universities the question is about.
 */
async function analyzeQuery(
  messages: ChatMessage[],
  selected: string[]
): Promise<Analysis> {
  const last = messages[messages.length - 1].content;
  const fallback: Analysis = { searchQuery: last, universityIds: [] };
  try {
    const uniList = UNIVERSITIES.map(
      (u) => `${u.id}: ${u.name} (aliases: ${u.aliases.join(", ")})`
    ).join("\n");
    const history = messages
      .slice(-6)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const res = await client().messages.create({
      model: config.queryModel,
      max_tokens: 300,
      system:
        "You prepare search queries for a Pakistani university information assistant. " +
        "The user may write English, Urdu script, or Roman Urdu (Urdu in Latin letters). " +
        "Reply with ONLY a JSON object: " +
        '{"search_query": string, "universities": string[]}. ' +
        "search_query: a standalone English query for the user's latest message, using the " +
        "conversation for context (resolve words like 'it' or 'there'). " +
        "universities: ids from the list that the question is about, or [] if none or if it is general. " +
        "Only include a university if the user clearly refers to it, now or earlier in the conversation.\n\n" +
        `Universities:\n${uniList}`,
      messages: [{ role: "user", content: history }],
    });
    const raw = textOf(res);
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const valid = new Set(UNIVERSITIES.map((u) => u.id));
    const ids = Array.isArray(json.universities)
      ? (json.universities as string[]).filter((id) => valid.has(id))
      : [];
    return {
      searchQuery:
        typeof json.search_query === "string" && json.search_query.trim()
          ? json.search_query
          : last,
      // the user's explicit selection in the UI always wins
      universityIds: selected.length ? selected : ids,
    };
  } catch {
    return { ...fallback, universityIds: selected };
  }
}

const SYSTEM = `You are an assistant that answers questions about universities in Pakistan (admissions, programs, fees, scholarships, deadlines, policies).

Rules:
1. Use ONLY the numbered sources provided. Never use outside knowledge for facts, numbers, dates, fees or requirements.
2. Cite sources inline like [1] or [2][3] right after the claim they support.
3. If the sources do not contain the answer, say clearly that you could not find it in the indexed official pages, and suggest checking the university's official website or admissions office. Do not guess.
4. If sources conflict or look like they are from different years, say so and tell the user to confirm the current figure.
5. Admission details change every cycle. For deadlines, fees and merit criteria, remind the user to verify on the official site.
6. Reply in the same language and script the user used: English, Urdu script, or Roman Urdu.
7. When comparing universities, only compare points that the sources actually state for each one, and say when one side is missing.
8. Be concise. Short paragraphs or a short list. No filler.`;

function buildContext(hits: Hit[]): string {
  if (!hits.length) return "(no relevant sources were found)";
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] ${h.universityName} | ${h.title || h.url}\nURL: ${h.url}\nFetched: ${h.fetchedAt.slice(0, 10)}\n${h.text}`
    )
    .join("\n\n---\n\n");
}

export async function chat(
  messages: ChatMessage[],
  selectedUniversityIds: string[] = []
): Promise<ChatResult> {
  const analysis = await analyzeQuery(messages, selectedUniversityIds);
  const hits = await search(analysis.searchQuery, {
    universityIds: analysis.universityIds,
  });

  const convo = messages.slice(-6).map((m, i, arr) =>
    i === arr.length - 1 && m.role === "user"
      ? {
          role: "user" as const,
          content: `Sources:\n\n${buildContext(hits)}\n\n=====\nQuestion: ${m.content}`,
        }
      : { role: m.role, content: m.content }
  );

  const res = await client().messages.create({
    model: config.answerModel,
    max_tokens: 1200,
    system: SYSTEM,
    messages: convo,
  });
  const answer = textOf(res).trim();

  const citedNums = new Set(
    [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]))
  );
  // one card per page even if several chunks of it were retrieved
  const seen = new Set<string>();
  const sources: Source[] = [];
  hits.forEach((h, i) => {
    const n = i + 1;
    if (seen.has(h.url) && !citedNums.has(n)) return;
    seen.add(h.url);
    sources.push({
      n,
      universityId: h.universityId,
      universityName: h.universityName,
      title: h.title || h.url,
      url: h.url,
      fetchedAt: h.fetchedAt,
      cited: citedNums.has(n),
    });
  });

  return { answer, sources, searchQuery: analysis.searchQuery };
}
