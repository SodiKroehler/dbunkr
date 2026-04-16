


-- drop the singleton constraint and add a type instead
ALTER TABLE pot DROP CONSTRAINT pot_id_check;
ALTER TABLE pot DROP CONSTRAINT pot_pkey;

ALTER TABLE pot ADD COLUMN type TEXT NOT NULL DEFAULT 'site' 
  CHECK (type IN ('site', 'research'));

ALTER TABLE pot ADD PRIMARY KEY (type);

-- drop the old row and reinsert both
DELETE FROM pot;
INSERT INTO pot (type, tokens_remaining) VALUES ('site', 1000000);
INSERT INTO pot (type, tokens_remaining) VALUES ('research', 500000);