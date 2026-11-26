import fs from "node:fs";
import { config } from "./config";
import { blobToFloats, getDb } from "./db";
import { embedTexts } from "./embeddings";

type Index = {
  mtime: number;
  dim: number;
  count: number;
  chunkIds: number[];
  uniIds: string[];
  matrix: Float32Array;
};

let cache: Index | null = null;

function loadIndex(): Index {
  let mtime = 0;
  try {
    const s = fs.statSync(config.dbPath + "-wal");
    mtime = Math.max(mtime, s.mtimeMs);
  } catch {
    /* no wal file */
  }
  try {
    mtime = Math.max(mtime, fs.statSync(config.dbPath).mtimeMs);
  } catch {
    /* db not created yet */
  }
  if (cache && cache.mtime === mtime) return cache;

  const rows = getDb()
    .prepare("SELECT id, university_id, embedding FROM chunks")
    .all() as { id: number; university_id: string; embedding: Buffer }[];

  if (!rows.length) {
    cache = {
      mtime,
      dim: 0,
      count: 0,
      chunkIds: [],
      uniIds: [],
      matrix: new Float32Array(0),
    };
    return cache;
  }
  const dim = blobToFloats(rows[0].embedding).length;
  const matrix = new Float32Array(rows.length * dim);
  const chunkIds: number[] = [];
  const uniIds: string[] = [];
  rows.forEach((r, i) => {
    matrix.set(blobToFloats(r.embedding), i * dim);
    chunkIds.push(r.id);
    uniIds.push(r.university_id);
  });
  cache = { mtime, dim, count: rows.length, chunkIds, uniIds, matrix };
  return cache;
}

export type Hit = {
  chunkId: number;
  score: number;
  text: string;
  universityId: string;
  universityName: string;
  title: string;
  url: string;
  fetchedAt: string;
};

export async function search(
  query: string,
  opts: { universityIds?: string[]; topK?: number } = {}
): Promise<Hit[]> {
  const idx = loadIndex();
  if (!idx.count) return [];

  const [q] = await embedTexts([query], "query");
  if (q.length !== idx.dim) {
    throw new Error(
      `Embedding size mismatch (query ${q.length}, index ${idx.dim}). ` +
        "Did you change EMBEDDINGS_PROVIDER or EMBEDDING_MODEL? Re-run: npm run embed -- --all"
    );
  }

  const filter = opts.universityIds?.length ? new Set(opts.universityIds) : null;
  const scored: { i: number; score: number }[] = [];
  for (let i = 0; i < idx.count; i++) {
    if (filter && !filter.has(idx.uniIds[i])) continue;
    let dot = 0;
    const off = i * idx.dim;
    for (let d = 0; d < idx.dim; d++) dot += idx.matrix[off + d] * q[d];
    if (dot >= config.minScore) scored.push({ i, score: dot });
  }
  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, opts.topK ?? config.topK);
  if (!top.length) return [];

  const db = getDb();
  const get = db.prepare(
    `SELECT c.id AS chunkId, c.text, c.university_id AS universityId,
            u.name AS universityName, d.title, d.url, d.fetched_at AS fetchedAt
     FROM chunks c
     JOIN documents d ON d.id = c.document_id
     JOIN universities u ON u.id = c.university_id
     WHERE c.id = ?`
  );
  return top.map(({ i, score }) => ({
    ...(get.get(idx.chunkIds[i]) as Omit<Hit, "score">),
    score,
  }));
}
