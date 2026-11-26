import { NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/answer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Very small in-memory limiter: 20 requests per minute per IP.
// Fine for one server process. Use Redis or your host's limiter in production.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 20;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  let body: { messages?: ChatMessage[]; universityIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Send at least one user message." }, { status: 400 });
  }
  const universityIds = Array.isArray(body.universityIds)
    ? body.universityIds.filter((x) => typeof x === "string").slice(0, 10)
    : [];

  try {
    return NextResponse.json(await chat(messages, universityIds));
  } catch (err) {
    console.error("chat error:", err);
    const msg = err instanceof Error ? err.message : "Something went wrong";
    // config errors are useful to see during setup; hide everything else
    const safe = /is not set|mismatch/.test(msg) ? msg : "Something went wrong. Please try again.";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
