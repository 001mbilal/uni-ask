# Ask Universities

An AI search tool for Pakistani universities, in the style of Ask Pakistan. You ask about admissions, fees, programs or scholarships in English, Urdu or Roman Urdu. It searches pages crawled from official university sites and answers with links to the source. If the pages don't contain the answer, it says so.

Covers 20 universities plus HEC out of the box (see `src/lib/universities.ts`).

## Setup

```bash
npm install
cp .env.example .env     # then fill in the keys
```

You need two API keys:

- `ANTHROPIC_API_KEY` from console.anthropic.com (answers and query understanding)
- `VOYAGE_API_KEY` from voyageai.com (embeddings)

Put your email in `CRAWL_CONTACT` so a university's IT team can reach you if the crawler bothers them.

## Run it

```bash
npm run crawl            # fetch pages from all universities (slow, polite, resumable)
npm run embed            # chunk and embed whatever is new or changed
npm run dev              # open http://localhost:3000
```

Useful extras:

```bash
npm run crawl -- nust lums          # crawl only these universities
npm run stats                       # pages and chunks per university
npm run search -- "bs cs fee" fast  # test retrieval without calling Claude
npm run embed -- --all              # re-embed everything (after changing the embedding model)
```

Try one or two universities first (`npm run crawl -- nust`) to check the output before crawling all of them.

## How it works

```
crawl.ts   fetch pages (robots.txt respected, 1s delay) -> text -> SQLite "documents"
embed.ts   split into ~1000 char chunks -> Voyage embeddings -> SQLite "chunks"
/api/chat  Claude Haiku rewrites the question into an English search query and spots
           which universities it is about -> vector search -> Claude Sonnet answers
           using only the retrieved chunks, with [1] [2] citations
```

Re-running the crawl only re-embeds pages whose text changed, so a weekly refresh is cheap.

## Adding or fixing a university

Edit `src/lib/universities.ts`. Put the admissions and fee pages in `seeds`, since the crawler starts there and follows links in priority order (admission, fee and scholarship URLs first). Check the seed URLs before the first crawl, because sites move pages around and I couldn't test the live sites from where I built this.

## Known limits

- **JavaScript-rendered sites.** The crawler reads server-rendered HTML. If a site loads its content with JavaScript, you'll get few pages for it. Check with `npm run stats`. The fix is a headless browser (Playwright) in `crawl.ts` for those sites.
- **Scanned PDFs.** Text PDFs work. Scanned ones come out empty and are skipped. Prospectuses are often scanned, so this matters. Add an OCR step if you see a lot of misses.
- **Search is brute force.** SQLite plus an in-memory cosine search is fine for tens of thousands of chunks. Past that, move `chunks` to Postgres with pgvector.
- **The rate limiter is in memory.** It is fine for one process. Use a real one before deploying publicly.
- **Wrong answers cost people.** A wrong deadline can cost someone an admission. Keep the source links and the "verify with the university" note visible.
- **Be a polite crawler.** Keep the delay, the contact in the user agent, and robots.txt on. Ask permission if you plan to run this commercially.
