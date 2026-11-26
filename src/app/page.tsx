import Chat from "./components/Chat";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const db = getDb();
  const universities = db
    .prepare(
      `SELECT u.id, u.name, u.city,
              (SELECT COUNT(*) FROM chunks c WHERE c.university_id = u.id) AS chunks
       FROM universities u ORDER BY u.name`
    )
    .all() as { id: string; name: string; city: string; chunks: number }[];

  const indexed = universities.filter((u) => u.chunks > 0);
  return <Chat universities={indexed} empty={indexed.length === 0} />;
}
