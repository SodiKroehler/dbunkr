-- Allow pot rows id=1 (site contributions) and id=2 (research contributions).
ALTER TABLE pot DROP CONSTRAINT IF EXISTS pot_id_check;

ALTER TABLE pot
  ADD CONSTRAINT pot_id_check CHECK (id IN (1, 2));

INSERT INTO pot (id, tokens_remaining)
VALUES (2, 0)
ON CONFLICT (id) DO NOTHING;
