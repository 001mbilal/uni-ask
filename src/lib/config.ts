import path from "node:path";

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : d;
};

export const config = {
  dbPath: process.env.DB_PATH || path.join(process.cwd(), "data", "uni.db"),

  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  answerModel: process.env.ANSWER_MODEL || "claude-sonnet-5-5",
  queryModel: process.env.QUERY_MODEL || "claude-haiku-5-5",

  embeddingsProvider: (process.env.EMBEDDINGS_PROVIDER || "voyage") as
    | "voyage"
    | "mock",
  voyageKey: process.env.VOYAGE_API_KEY || "",
  embeddingModel: process.env.EMBEDDING_MODEL || "voyage-3.5",

  crawlContact: process.env.CRAWL_CONTACT || "unset",
  crawlMaxPages: num(process.env.CRAWL_MAX_PAGES, 150),
  crawlMaxDepth: num(process.env.CRAWL_MAX_DEPTH, 3),
  crawlDelayMs: num(process.env.CRAWL_DELAY_MS, 1000),
  crawlConcurrency: num(process.env.CRAWL_CONCURRENCY, 4),

  topK: num(process.env.TOP_K, 8),
  minScore: num(process.env.MIN_SCORE, 0.25),
};
