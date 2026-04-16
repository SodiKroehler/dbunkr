-- dbunkr Migration v2
-- Run after init_migration.sql

-- Drop old tables
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS streams;

-- Streams: one per LLM per stub
-- canon: JSONB array of canonical message objects
-- river: text for now, will be a table later
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stub_id UUID NOT NULL REFERENCES stubs(id) ON DELETE CASCADE,
  llm TEXT NOT NULL CHECK (llm IN ('claude', 'grok')),
  canon JSONB NOT NULL DEFAULT '[]',
  river TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stub_id, llm)
);

-- Stream messages: all messages sent to a stream
CREATE TABLE stream_msgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX stream_msgs_stream_idx ON stream_msgs (stream_id, created_at);


ALTER TABLE stream_msgs ADD COLUMN session_id TEXT;