import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Neon schema.");
}

const sql = neon(databaseUrl);

await sql.query(`
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
`);

await sql.query(`
CREATE TABLE IF NOT EXISTS stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  rq TEXT NOT NULL,
  blurb TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('seeded', 'proposed', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`);

await sql.query(`
CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stub_id UUID NOT NULL REFERENCES stubs(id) ON DELETE CASCADE,
  llm TEXT NOT NULL CHECK (llm IN ('claude', 'grok')),
  canon JSONB NOT NULL DEFAULT '[]',
  river TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stub_id, llm)
);
`);

await sql.query(`
CREATE TABLE IF NOT EXISTS stream_msgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`);

console.log("Neon schema initialized: stubs, streams, stream_msgs");
