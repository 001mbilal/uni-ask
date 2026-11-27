import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import tls from "node:tls";
import robotsParser from "robots-parser";
import { config } from "../src/lib/config";
import { getDb } from "../src/lib/db";
import { extractHtml, extractPdf } from "../src/lib/extract";
import { UNIVERSITIES, type UniversitySeed } from "../src/lib/universities";

const UA = `UniAskBot/0.1 (+contact: ${config.crawlContact})`;
const MAX_BYTES = 15 * 1024 * 1024;
const MIN_TEXT = 200;

const SKIP_EXT =
  /\.(jpe?g|png|gif|svg|webp|ico|css|js|zip|rar|7z|mp3|mp4|avi|mov|wmv|docx?|xlsx?|pptx?|exe|apk|woff2?|ttf)(\?|$)/i;

// URLs containing these words are crawled first
const KEYWORDS: [RegExp, number][] = [
  [/admission|apply|prospectus/i, 5],
  [/fee|tuition|financial|scholarship|aid|stipend/i, 5],
  [/eligib|merit|deadline|schedule|test|entry/i, 3],
  [/program|undergrad|graduate|bs-|ms-|phd|degree|course/i, 3],
  [/faq|how-to|hostel|transport|calendar|policy|rules/i, 2],
  [/department|faculty|school/i, 1],
];
const AVOID = /news|event|gallery|photo|video|tender|career|job|alumni|login|calendar\/\d|\/tag\/|\/category\/|\/author\/|\/feed|print=/i;

// Skip pages whose title or opening text indicate a student roll: seat lists,
// named merit/result lists, result sheets. These contain personal names and
// have no value for admission queries.
export const SKIP_ROLL =
  /\bseat[\s\-]list\b|\bmerit[\s\-]list\b|\bresult\s+sheet\b|\broll\s*no\.?\s+\d|\bstudent\s+name\s+gender\b/i;

// Domains whose servers have a broken TLS cert chain (valid leaf cert, missing intermediate).
// We supply the missing intermediate from certs/ so full chain verification succeeds.
// Each cert was obtained from the AIA extension in that domain's leaf certificate.
//   szabist.edu.pk → certs/rapidssl-tls-rsa-ca-g1.pem
//     source: http://cacerts.rapidssl.com/RapidSSLTLSRSACAG1.crt (AIA in leaf cert)
//     subject: CN=RapidSSL TLS RSA CA G1, O=DigiCert Inc
const BROKEN_CHAIN_DOMAINS = new Set(["szabist.edu.pk"]);

export function score(url: string, depth: number) {
  let s = -depth;
  for (const [re, w] of KEYWORDS) if (re.test(url)) s += w;
  if (AVOID.test(url)) s -= 4;
  if (/\.pdf(\?|$)/i.test(url)) s += 2;
  return s;
}

// A URL whose only years are old (e.g. prospectus_2007.pdf) is stale. URLs that
// also mention a recent year (fee-structure-fall-2022-till-spring-2025) are kept.
const OLDEST_YEAR = new Date().getFullYear() - 2;
export function isStaleUrl(url: string): boolean {
  const years = [...url.matchAll(/(?<!\d)(20[0-3]\d)(?!\d)/g)].map((m) => Number(m[1]));
  return years.length > 0 && Math.max(...years) < OLDEST_YEAR;
}

export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|replytocom|share|print)/i.test(k)) u.searchParams.delete(k);
    }
    if (u.search.length > 60 || u.toString().length > 220) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function inDomain(url: string, domain: string) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h === domain || h.endsWith("." + domain);
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Robots = ReturnType<typeof robotsParser>;
const robotsCache = new Map<string, Robots | null>();

async function getRobots(origin: string): Promise<Robots | null> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let r: Robots | null = null;
  try {
    const res = await fetch(origin + "/robots.txt", {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) r = robotsParser(origin + "/robots.txt", await res.text());
  } catch {
    /* no robots.txt reachable: treat as allowed */
  }
  robotsCache.set(origin, r);
  return r;
}

async function crawlUniversity(uni: UniversitySeed) {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO documents (university_id, url, title, kind, text, content_hash, fetched_at)
    VALUES (@university_id, @url, @title, @kind, @text, @content_hash, @fetched_at)
    ON CONFLICT(url) DO UPDATE SET
      title=excluded.title, kind=excluded.kind, text=excluded.text,
      content_hash=excluded.content_hash, fetched_at=excluded.fetched_at`);
  const existing = db.prepare("SELECT content_hash FROM documents WHERE url = ?");
  const dupOf = db.prepare(
    "SELECT url FROM documents WHERE university_id = ? AND content_hash = ? AND url != ? LIMIT 1"
  );

  const queue: { url: string; depth: number; s: number }[] = [];
  const seen = new Set<string>();
  const push = (url: string | null, depth: number) => {
    if (!url || seen.has(url) || !inDomain(url, uni.domain) || SKIP_EXT.test(url) || isStaleUrl(url)) return;
    if (uni.exclude?.includes(url)) return; // permanently excluded exact URL
    if (uni.excludePrefixes?.some((p) => url.startsWith(p))) return; // excluded prefix
    seen.add(url);
    queue.push({ url, depth, s: score(url, depth) });
  };
  for (const s of uni.seeds) push(normalizeUrl(s), 0);

  let stored = 0, changed = 0, fetched = 0, failed = 0, tooShort = 0, skippedRolls = 0, offDomain = 0, duplicates = 0;
  const consec = new Map<string, number>(); // consecutive 403/429 count per origin
  const blocked = new Set<string>();        // origins that tripped the circuit breaker
  const statuses = new Map<string, number>();
  const tally = (k: string) => statuses.set(k, (statuses.get(k) ?? 0) + 1);
  const log = (m: string) => console.log(`[${uni.id}] ${m}`);

  // For domains with a broken TLS cert chain, supply the missing intermediate
  // certificate so full chain verification can succeed.
  let dispatcher: unknown;
  if (BROKEN_CHAIN_DOMAINS.has(uni.domain)) {
    const { Agent } = await import("undici");
    const intermediatePem = fs.readFileSync(
      path.join(process.cwd(), "certs", "rapidssl-tls-rsa-ca-g1.pem"),
      "utf8"
    );
    dispatcher = new Agent({ connect: { ca: [...tls.rootCertificates, intermediatePem] } });
  }

  while (queue.length && fetched < config.crawlMaxPages) {
    // best-scoring URL next
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].s > queue[bi].s) bi = i;
    const { url, depth } = queue.splice(bi, 1)[0];

    // skip without spending page budget on origins that have hard-blocked us
    if (blocked.has(new URL(url).origin)) continue;

    const robots = await getRobots(new URL(url).origin);
    if (robots && robots.isAllowed(url, UA) === false) continue;

    fetched++;
    await sleep(config.crawlDelayMs);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchOpts: any = {
        headers: { "User-Agent": UA, Accept: "text/html,application/pdf;q=0.9,*/*;q=0.1" },
        redirect: "follow",
        signal: AbortSignal.timeout(25000),
      };
      if (dispatcher) fetchOpts.dispatcher = dispatcher;
      const res = await fetch(url, fetchOpts);
      if (!res.ok) {
        if (res.status === 403 || res.status === 429) {
          const o = new URL(url).origin;
          const n = (consec.get(o) ?? 0) + 1;
          consec.set(o, n);
          if (n >= 5 && !blocked.has(o)) {
            blocked.add(o);
            log(`circuit breaker: ${o} returned ${res.status} ${n} times in a row — skipping remaining URLs from this origin`);
          }
        }
        failed++;
        tally(String(res.status));
        if (failed <= 3) log(`HTTP ${res.status}: ${url}`);
        continue;
      }
      // a redirect may have left the university's domain
      if (!inDomain(res.url, uni.domain)) { offDomain++; continue; }
      consec.set(new URL(url).origin, 0); // reset circuit breaker on success

      const type = (res.headers.get("content-type") || "").toLowerCase();
      const len = Number(res.headers.get("content-length") || 0);
      if (len > MAX_BYTES) continue;

      let title = "", text = "", kind = "html";
      let links: string[] = [];
      if (type.includes("application/pdf") || /\.pdf(\?|$)/i.test(url)) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > MAX_BYTES) continue;
        const p = await extractPdf(buf);
        title = p.title || decodeURIComponent(url.split("/").pop() || url);
        text = p.text;
        kind = "pdf";
      } else if (type.includes("text/html") || type === "") {
        const e = extractHtml(await res.text(), res.url);
        title = e.title; text = e.text; links = e.links;
      } else {
        continue;
      }

      if (depth < config.crawlMaxDepth) {
        for (const l of links) push(normalizeUrl(l), depth + 1);
      }
      if (text.length < MIN_TEXT) {
        tooShort++;
        if (kind === "pdf") tally("pdf-no-text (scanned?)");
        continue;
      }
      // Skip student rolls: seat lists, named merit/result lists, entry-test
      // result sheets. Checked on title + first 300 chars to catch short PDFs.
      if (SKIP_ROLL.test(title) || SKIP_ROLL.test(text.slice(0, 300))) {
        skippedRolls++;
        tally("student-roll (skipped)");
        continue;
      }

      const hash = crypto.createHash("sha256").update(text).digest("hex");
      // same text under another URL (www vs bare host, /index vs /): keep the first
      if (dupOf.get(uni.id, hash, url)) { duplicates++; continue; }
      const prev = existing.get(url) as { content_hash: string } | undefined;
      if (!prev || prev.content_hash !== hash) changed++;
      upsert.run({
        university_id: uni.id, url, title, kind, text,
        content_hash: hash, fetched_at: new Date().toISOString(),
      });
      stored++;
      if (stored % 25 === 0) log(`${stored} pages stored (${fetched} fetched, ${queue.length} queued)`);
    } catch (err) {
      failed++;
      tally("network/parse error");
      if (failed <= 3) log(`fetch failed: ${url} (${(err as Error).message})`);
    }
  }
  const why = [...statuses].map(([k, v]) => `${k}=${v}`).join(", ");
  const blockedMsg = blocked.size
    ? `\n[${uni.id}] circuit breaker triggered for: ${[...blocked].join(", ")}`
    : "";
  log(
    `done: ${stored} stored, ${changed} new or changed, ${failed} failed, ` +
      `${tooShort} too short (<${MIN_TEXT} chars), ${skippedRolls} student rolls skipped, ` +
      `${offDomain} redirected off-domain, ${duplicates} duplicates skipped` +
      (why ? `\n[${uni.id}] failure breakdown: ${why}` : "") +
      blockedMsg
  );
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const targets = only.length
    ? UNIVERSITIES.filter((u) => only.includes(u.id))
    : UNIVERSITIES;
  if (!targets.length) {
    console.error("No matching universities. Known ids:", UNIVERSITIES.map((u) => u.id).join(", "));
    process.exit(1);
  }
  console.log(`Crawling ${targets.length} site(s) as: ${UA}`);

  let next = 0;
  const worker = async () => {
    while (next < targets.length) await crawlUniversity(targets[next++]);
  };
  await Promise.all(
    Array.from({ length: Math.min(config.crawlConcurrency, targets.length) }, worker)
  );
  console.log("Crawl finished. Next: npm run embed");
}

// Guard: run main only when executed as a script, not when imported (e.g. by tests)
const _argv1 = process.argv[1] ?? "";
if (_argv1.endsWith("/scripts/crawl.ts") || _argv1.endsWith("/scripts/crawl.js") || _argv1 === "scripts/crawl.ts") {
  main().catch((e) => { console.error(e); process.exit(1); });
}
