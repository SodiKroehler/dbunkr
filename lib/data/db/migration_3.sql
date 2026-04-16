CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX stubs_trgm_idx ON stubs USING GIN (rq gin_trgm_ops);


ALTER TABLE stream_msgs ADD COLUMN session_id TEXT;
ALTER TABLE stream_msgs ADD COLUMN uname TEXT;
ALTER TABLE stream_msgs ADD COLUMN type TEXT NOT NULL DEFAULT 'ephemeral' CHECK (type IN ('ephemeral', 'canon', 'proposed'));


ALTER TABLE stubs ADD COLUMN left_truth INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stubs ADD COLUMN right_truth INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stubs ADD COLUMN center_truth INTEGER NOT NULL DEFAULT 0;


ALTER TABLE stubs DROP CONSTRAINT stubs_status_check;
ALTER TABLE stubs ADD CONSTRAINT stubs_status_check 
  CHECK (status IN ('seeded', 'proposed', 'approved', 'biddable'));