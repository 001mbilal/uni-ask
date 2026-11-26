import "dotenv/config";
import { search } from "../src/lib/retrieve";

// Retrieval only, no LLM. Useful for checking what the index returns.
//   npm run search -- "bs computer science fee" [universityId ...]
async function main() {
  const [query, ...ids] = process.argv.slice(2);
  if (!query) {
    console.error('Usage: npm run search -- "your question" [universityId ...]');
    process.exit(1);
  }
  const hits = await search(query, { universityIds: ids });
  if (!hits.length) console.log("No results above the score threshold.");
  for (const h of hits) {
    console.log(`\n${h.score.toFixed(3)}  ${h.universityId}  ${h.url}`);
    console.log(h.text.slice(0, 300).replace(/\n/g, " ") + (h.text.length > 300 ? "..." : ""));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
