import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Neon schema.");
}

const sql = neon(databaseUrl);

await sql.query(`
CREATE SCHEMA IF NOT EXISTS stub;
`);

await sql.query(`
CREATE TABLE IF NOT EXISTS stub.entries (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_agree INTEGER NOT NULL DEFAULT 0,
  right_agree INTEGER NOT NULL DEFAULT 0,
  moderate_agree INTEGER NOT NULL DEFAULT 0
);
`);

console.log("Neon schema initialized: stub.entries");
