import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { UNIVERSITIES } from "./universities";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS universities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      domain TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      university_id TEXT NOT NULL REFERENCES universities(id),
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      kind TEXT NOT NULL,            -- html | pdf
      text TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      embedded_hash TEXT             -- content_hash that chunks were built from
    );
    CREATE INDEX IF NOT EXISTS idx_documents_uni ON documents(university_id);
    CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      university_id TEXT NOT NULL,
      idx INTEGER NOT NULL,
      text TEXT NOT NULL,
      embedding BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_uni ON chunks(university_id);
  `);

  const upsert = db.prepare(
    `INSERT INTO universities (id, name, city, domain) VALUES (@id, @name, @city, @domain)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, city=excluded.city, domain=excluded.domain`
  );
  for (const u of UNIVERSITIES) {
    upsert.run({ id: u.id, name: u.name, city: u.city, domain: u.domain });
  }
  _db = db;
  return db;
}

export function floatsToBlob(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

export function blobToFloats(b: Buffer): Float32Array {
  const copy = new Uint8Array(b.byteLength);
  copy.set(b);
  return new Float32Array(copy.buffer);
}
