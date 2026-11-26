import "dotenv/config";
import { getDb } from "../src/lib/db";

const rows = getDb()
  .prepare(
    `SELECT u.id, u.name,
            (SELECT COUNT(*) FROM documents d WHERE d.university_id = u.id) AS docs,
            (SELECT COUNT(*) FROM chunks c WHERE c.university_id = u.id) AS chunks,
            (SELECT MAX(fetched_at) FROM documents d WHERE d.university_id = u.id) AS last_crawl
     FROM universities u ORDER BY docs DESC`
  )
  .all() as { id: string; name: string; docs: number; chunks: number; last_crawl: string | null }[];

console.log("id".padEnd(12), "docs".padStart(6), "chunks".padStart(8), "  last crawl");
for (const r of rows) {
  console.log(
    r.id.padEnd(12),
    String(r.docs).padStart(6),
    String(r.chunks).padStart(8),
    " ",
    r.last_crawl ? r.last_crawl.slice(0, 16) : "never"
  );
}
const total = rows.reduce((a, r) => ({ d: a.d + r.docs, c: a.c + r.chunks }), { d: 0, c: 0 });
console.log(`\nTotal: ${total.d} documents, ${total.c} chunks`);
