-- dbunkr Migration v4: stub related links + official truth aggregate

ALTER TABLE stubs ADD COLUMN IF NOT EXISTS related_links TEXT;

ALTER TABLE stubs ADD COLUMN IF NOT EXISTS official_truth SMALLINT NOT NULL DEFAULT 50
  CHECK (official_truth >= 0 AND official_truth <= 100);
