-- Bunker DB Migration v1
-- Run this in your Neon SQL editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full text search config
CREATE TEXT SEARCH CONFIGURATION bunker_search (COPY = english);

-- Stubs: the core research question pages
CREATE TABLE stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  rq TEXT NOT NULL,
  blurb TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('seeded', 'proposed', 'approved')),
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX stubs_search_idx ON stubs USING GIN (search_vector);
CREATE INDEX stubs_status_idx ON stubs (status);

-- Auto-update search vector on insert/update
CREATE OR REPLACE FUNCTION stubs_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.rq, '') || ' ' || coalesce(NEW.blurb, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stubs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON stubs
  FOR EACH ROW EXECUTE FUNCTION stubs_search_vector_update();

-- Streams: one per LLM per stub
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stub_id UUID NOT NULL REFERENCES stubs(id) ON DELETE CASCADE,
  llm TEXT NOT NULL CHECK (llm IN ('claude', 'grok')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stub_id, llm)
);

-- Messages: the river
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX messages_stream_idx ON messages (stream_id, created_at);

-- Votes: pluralism graph
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stub_id UUID NOT NULL REFERENCES stubs(id) ON DELETE CASCADE,
  political_id TEXT NOT NULL CHECK (political_id IN ('dem', 'rep', 'ind', 'other')),
  belief TEXT NOT NULL CHECK (belief IN ('true', 'false', 'uncertain')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX votes_stub_idx ON votes (stub_id);


-- Bids: researcher proposals on postings
CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id UUID NOT NULL REFERENCES postings(id) ON DELETE CASCADE,
  orcid TEXT NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  pitch TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bids_posting_idx ON bids (posting_id);

-- Bid votes: up/down
CREATE TABLE bid_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX bid_votes_bid_idx ON bid_votes (bid_id);

-- Pot: one row, always
CREATE TABLE pot (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tokens_remaining INTEGER NOT NULL DEFAULT 100000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pot (tokens_remaining) VALUES (100000);

-- Seed stubs (status = 'seeded' skips approval queue)
INSERT INTO stubs (slug, rq, blurb, status) VALUES
  ('vaccines-autism', 'Do vaccines cause autism?', 'The claim that vaccines cause autism originates from a 1998 study by Andrew Wakefield, which was retracted due to ethical violations and data manipulation. Extensive research involving millions of children has found no link.', 'seeded'),
  ('election-fraud-2020', 'Was the 2020 US presidential election stolen?', 'Dozens of courts, election officials from both parties, and federal agencies including the DOJ found no evidence of fraud sufficient to change the outcome of the 2020 election.', 'seeded'),
  ('climate-change-hoax', 'Is climate change a hoax invented by scientists?', 'Over 97% of actively publishing climate scientists agree that climate change is real and primarily human-caused. The claim of a coordinated scientific hoax is not supported by evidence.', 'seeded'),
  ('ivermectin-covid', 'Does ivermectin cure COVID-19?', 'Multiple large randomized controlled trials found that ivermectin does not significantly reduce hospitalization or death in COVID-19 patients. Early studies suggesting benefit were later found to have serious methodological flaws.', 'seeded'),
  ('5g-covid', 'Did 5G networks cause or spread COVID-19?', 'COVID-19 is caused by the SARS-CoV-2 virus, which spreads through respiratory droplets. Radio waves cannot carry or transmit viruses. Many countries without 5G infrastructure also experienced outbreaks.', 'seeded'),
  ('flat-earth', 'Is the Earth flat?', 'The spherical shape of the Earth has been confirmed through satellite imagery, circumnavigation, physics, astronomy, and direct observation. No credible scientific evidence supports a flat Earth model.', 'seeded'),
  ('bill-gates-microchips', 'Is Bill Gates using vaccines to implant microchips?', 'No vaccine approved anywhere in the world contains microchips. This claim has been repeatedly debunked and is not supported by any credible evidence.', 'seeded'),
  ('fluoride-mind-control', 'Does fluoride in water cause harm or control minds?', 'Water fluoridation at recommended levels (0.7 mg/L in the US) is endorsed by major health organizations worldwide. No credible evidence links it to neurological harm or behavioral control at these concentrations.', 'seeded'),
  ('moon-landing-fake', 'Was the moon landing faked by NASA?', 'The Apollo missions are confirmed by independent evidence including lunar samples, retroreflectors still in use today, and tracking data from non-US nations including the Soviet Union.', 'seeded'),
  ('chemtrails', 'Are chemtrails a government chemical spraying program?', 'Contrails (condensation trails) are formed by water vapor freezing around exhaust particles at high altitude. Atmospheric scientists have found no evidence of a secret chemical spraying program.', 'seeded');