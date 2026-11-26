import "dotenv/config";
import { chunkText } from "../src/lib/chunk";
import { config } from "../src/lib/config";
import { floatsToBlob, getDb } from "../src/lib/db";
import { embedTexts } from "../src/lib/embeddings";

type Doc = {
  id: number;
  university_id: string;
  university_name: string;
  title: string;
  text: string;
  content_hash: string;
};

async function main() {
  const all = process.argv.includes("--all");
  const db = getDb();

  if (all) db.prepare("UPDATE documents SET embedded_hash = NULL").run();

  const docs = db
    .prepare(
      `SELECT d.id, d.university_id, u.name AS university_name, d.title, d.text, d.content_hash
       FROM documents d JOIN universities u ON u.id = d.university_id
       WHERE d.embedded_hash IS NULL OR d.embedded_hash != d.content_hash`
    )
    .all() as Doc[];

  if (!docs.length) {
    console.log("Nothing to embed. Everything is up to date.");
    return;
  }
  console.log(`Embedding ${docs.length} document(s) with ${config.embeddingsProvider}/${config.embeddingModel}`);

  const delChunks = db.prepare("DELETE FROM chunks WHERE document_id = ?");
  const insChunk = db.prepare(
    "INSERT INTO chunks (document_id, university_id, idx, text, embedding) VALUES (?, ?, ?, ?, ?)"
  );
  const mark = db.prepare("UPDATE documents SET embedded_hash = ? WHERE id = ?");

  let done = 0, totalChunks = 0;
  for (const doc of docs) {
    const chunks = chunkText(doc.text);
    // the university and page title go into the embedded text so that
    // "NUST fee structure" can match a chunk that only lists numbers
    const inputs = chunks.map((c) => `${doc.university_name} | ${doc.title}\n${c}`);
    const vectors = await embedTexts(inputs, "document");

    db.transaction(() => {
      delChunks.run(doc.id);
      chunks.forEach((c, i) =>
        insChunk.run(doc.id, doc.university_id, i, c, floatsToBlob(vectors[i]))
      );
      mark.run(doc.content_hash, doc.id);
    })();

    totalChunks += chunks.length;
    if (++done % 20 === 0 || done === docs.length) {
      console.log(`  ${done}/${docs.length} documents, ${totalChunks} chunks`);
    }
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
