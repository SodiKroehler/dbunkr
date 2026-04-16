CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX stubs_trgm_idx ON stubs USING GIN (rq gin_trgm_ops);


ALTER TABLE stream_msgs ADD COLUMN session_id TEXT;
ALTER TABLE stream_msgs ADD COLUMN uname TEXT;