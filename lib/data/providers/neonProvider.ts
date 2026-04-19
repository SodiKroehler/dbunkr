import { neon } from "@neondatabase/serverless";
import { sitePotCostFromMessage } from "@/lib/pot/site-cost";
import type {
  BiasVoteAxis,
  BidRecord,
  BidVoteDirection,
  CreateBidInput,
  CreateStubRecordInput,
  DataProvider,
  StreamCanonMessage,
  StreamMessageRecord,
  PotRecord,
  PotState,
  StreamRecord,
  StreamSearchInput,
  StubRecord,
  StubVoteType,
} from "@/lib/data/providers/types";

const INIT_SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS stubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  rq TEXT NOT NULL,
  blurb TEXT,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('seeded', 'proposed', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stub_id UUID NOT NULL REFERENCES stubs(id) ON DELETE CASCADE,
  llm TEXT NOT NULL CHECK (llm IN ('claude', 'grok')),
  canon JSONB NOT NULL DEFAULT '[]',
  river TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stub_id, llm)
);

CREATE TABLE IF NOT EXISTS stream_msgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stubs ADD COLUMN IF NOT EXISTS related_links TEXT;
ALTER TABLE stubs ADD COLUMN IF NOT EXISTS official_truth SMALLINT NOT NULL DEFAULT 50;
`;

type NeonStubRecordRow = {
  id: string;
  slug: string;
  rq: string;
  blurb: string | null;
  related_links?: string | null;
  official_truth?: number | string | null;
  left_truth: number | string;
  right_truth: number | string;
  center_truth: number | string;
  close_votes: number | string;
  importance_level: number | string;
  status: string;
  created_at: string | Date;
};

function mapRow(row: NeonStubRecordRow): StubRecord {
  return {
    id: row.id,
    slug: row.slug,
    rq: row.rq,
    blurb: row.blurb,
    related_links: row.related_links ?? null,
    official_truth:
      row.official_truth !== undefined && row.official_truth !== null
        ? Number(row.official_truth)
        : 50,
    left_truth: Number(row.left_truth),
    right_truth: Number(row.right_truth),
    center_truth: Number(row.center_truth),
    close_votes: Number(row.close_votes),
    importance_level: Number(row.importance_level),
    status: row.status,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

type NeonStreamRecordRow = {
  id: string;
  stub_id: string;
  stub_slug: string;
  llm: "claude" | "grok";
  canon: unknown;
  river: string;
  created_at: string | Date;
};

type NeonStreamMessageRow = {
  id: string;
  stream_id: string;
  role: "user" | "assistant";
  session_id: string | null;
  uname: string;
  type: string;
  content: string;
  created_at: string | Date;
};

type NeonPotRow = {
  id: number;
  tokens_remaining: number | string;
  updated_at: string | Date;
};

type NeonBidRow = {
  id: string;
  stub_id: string;
  orcid: string;
  name: string;
  website: string | null;
  pitch: string;
  votes_for: number | string;
  votes_against: number | string;
  created_at: string | Date;
};

function mapBidRow(row: NeonBidRow): BidRecord {
  return {
    id: row.id,
    stub_id: row.stub_id,
    orcid: row.orcid,
    name: row.name,
    website: row.website,
    pitch: row.pitch,
    votes_for: Number(row.votes_for),
    votes_against: Number(row.votes_against),
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function mapStreamCanon(input: unknown): StreamCanonMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;
      if (
        (role === "user" || role === "assistant" || role === "system") &&
        typeof content === "string"
      ) {
        return { role, content } as StreamCanonMessage;
      }
      return null;
    })
    .filter((msg): msg is StreamCanonMessage => msg !== null);
}

function mapStreamRow(row: NeonStreamRecordRow): StreamRecord {
  return {
    id: row.id,
    stub_id: row.stub_id,
    stub_slug: row.stub_slug,
    llm: row.llm,
    canon: mapStreamCanon(row.canon),
    river: row.river,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function mapStreamMessageRow(row: NeonStreamMessageRow): StreamMessageRecord {
  return {
    id: row.id,
    stream_id: row.stream_id,
    role: row.role,
    session_id: row.session_id,
    uname: row.uname,
    type: row.type,
    content: row.content,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function mapPotRow(row: NeonPotRow): PotRecord {
  return {
    id: Number(row.id),
    tokens_remaining: Number(row.tokens_remaining),
    updated_at:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at),
  };
}

export class NeonDataProvider implements DataProvider {
  public readonly name = "neon" as const;
  private readonly sql;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async initStubSchema(): Promise<void> {
    await this.sql.query(INIT_SCHEMA_SQL);
  }

  async listStubRecords(): Promise<StubRecord[]> {
    let rows: NeonStubRecordRow[];
    try {
      rows = (await this.sql`
        SELECT
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at
        FROM stubs
        ORDER BY created_at DESC;
      `) as NeonStubRecordRow[];
    } catch (error) {
      if ((error as { code?: string })?.code !== "42703") throw error;
      rows = (await this.sql`
        SELECT
          id,
          slug,
          rq,
          blurb,
          0 AS left_truth,
          0 AS right_truth,
          0 AS center_truth,
          NULL::text AS related_links,
          50 AS official_truth,
          0 AS close_votes,
          0 AS importance_level,
          status,
          created_at
        FROM stubs
        ORDER BY created_at DESC;
      `) as NeonStubRecordRow[];
    }

    return rows.map(mapRow);
  }

  async matchStubs(query: string): Promise<StubRecord[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.listStubRecords();
    }

    let rows: NeonStubRecordRow[];
    try {
      rows = (await this.sql`
        SELECT
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at
        FROM (
          SELECT
            id,
            slug,
            rq,
            blurb,
            left_truth,
            right_truth,
            center_truth,
            related_links,
            official_truth,
            close_votes,
            importance_level,
            status,
            created_at,
            similarity(rq, ${trimmed}) AS score
          FROM stubs
        ) matched
        WHERE score > 0.15
        ORDER BY score DESC
        LIMIT 5;
      `) as NeonStubRecordRow[];
    } catch (error) {
      if ((error as { code?: string })?.code !== "42703") throw error;
      rows = (await this.sql`
        SELECT
          id,
          slug,
          rq,
          blurb,
          0 AS left_truth,
          0 AS right_truth,
          0 AS center_truth,
          NULL::text AS related_links,
          50 AS official_truth,
          0 AS close_votes,
          0 AS importance_level,
          status,
          created_at
        FROM (
          SELECT
            id,
            slug,
            rq,
            blurb,
            0 AS close_votes,
            0 AS importance_level,
            status,
            created_at,
            similarity(rq, ${trimmed}) AS score
          FROM stubs
        ) matched
        WHERE score > 0.15
        ORDER BY score DESC
        LIMIT 5;
      `) as NeonStubRecordRow[];
    }

    return rows.map(mapRow);
  }

  async listOpenStubs(): Promise<StubRecord[]> {
    let rows: NeonStubRecordRow[];
    try {
      rows = (await this.sql`
        SELECT
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at
        FROM stubs
        WHERE status = 'biddable'
        ORDER BY importance_level DESC, created_at DESC;
      `) as NeonStubRecordRow[];
    } catch (error) {
      if ((error as { code?: string })?.code !== "42703") throw error;
      rows = [];
    }
    return rows.map(mapRow);
  }

  async getStubBySlug(slug: string): Promise<StubRecord | null> {
    let rows: NeonStubRecordRow[];
    try {
      rows = (await this.sql`
        SELECT
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at
        FROM stubs
        WHERE slug = ${slug}
        LIMIT 1;
      `) as NeonStubRecordRow[];
    } catch (error) {
      if ((error as { code?: string })?.code !== "42703") throw error;
      rows = (await this.sql`
        SELECT
          id,
          slug,
          rq,
          blurb,
          0 AS left_truth,
          0 AS right_truth,
          0 AS center_truth,
          NULL::text AS related_links,
          50 AS official_truth,
          0 AS close_votes,
          0 AS importance_level,
          status,
          created_at
        FROM stubs
        WHERE slug = ${slug}
        LIMIT 1;
      `) as NeonStubRecordRow[];
    }

    return rows[0] ? mapRow(rows[0]) : null;
  }

  async createStubRecord(input: CreateStubRecordInput): Promise<StubRecord> {
    const rows = (await this.sql`
      INSERT INTO stubs (
        slug,
        rq,
        blurb,
        left_truth,
        right_truth,
        center_truth,
        related_links,
        official_truth,
        close_votes,
        importance_level,
        status
      )
      VALUES (
        ${input.slug},
        ${input.rq},
        ${input.blurb ?? null},
        ${input.left_truth ?? 0},
        ${input.right_truth ?? 0},
        ${input.center_truth ?? 0},
        ${input.related_links ?? null},
        ${input.official_truth ?? 50},
        ${input.close_votes ?? 0},
        ${input.importance_level ?? 0},
        ${input.status ?? "proposed"}
      )
      RETURNING
        id,
        slug,
        rq,
        blurb,
        left_truth,
        right_truth,
        center_truth,
        related_links,
        official_truth,
        close_votes,
        importance_level,
        status,
        created_at;
    `) as NeonStubRecordRow[];

    return mapRow(rows[0]);
  }

  async applyStubVote(stubId: string, voteType: StubVoteType): Promise<StubRecord | null> {
    let rows: NeonStubRecordRow[];
    if (voteType === "close_forward") {
      rows = (await this.sql`
        UPDATE stubs
        SET close_votes = close_votes + 1
        WHERE id = ${stubId}
        RETURNING
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at
      `) as NeonStubRecordRow[];
    } else if (voteType === "importance_forward") {
      rows = (await this.sql`
        UPDATE stubs
        SET importance_level = importance_level + 1
        WHERE id = ${stubId}
        RETURNING
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at
      `) as NeonStubRecordRow[];
    } else {
      rows = (await this.sql`
        UPDATE stubs
        SET importance_level = GREATEST(importance_level - 1, 0)
        WHERE id = ${stubId}
        RETURNING
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at
      `) as NeonStubRecordRow[];
    }

    return rows[0] ? mapRow(rows[0]) : null;
  }

  async incrementStubBiasVote(slug: string, axis: BiasVoteAxis): Promise<StubRecord | null> {
    let rows: NeonStubRecordRow[];
    if (axis === "left") {
      rows = (await this.sql`
        UPDATE stubs
        SET left_truth = LEAST(left_truth + 1, 100)
        WHERE slug = ${slug}
        RETURNING
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at;
      `) as NeonStubRecordRow[];
    } else if (axis === "center") {
      rows = (await this.sql`
        UPDATE stubs
        SET center_truth = LEAST(center_truth + 1, 100)
        WHERE slug = ${slug}
        RETURNING
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at;
      `) as NeonStubRecordRow[];
    } else {
      rows = (await this.sql`
        UPDATE stubs
        SET right_truth = LEAST(right_truth + 1, 100)
        WHERE slug = ${slug}
        RETURNING
          id,
          slug,
          rq,
          blurb,
          left_truth,
          right_truth,
          center_truth,
          related_links,
          official_truth,
          close_votes,
          importance_level,
          status,
          created_at;
      `) as NeonStubRecordRow[];
    }

    return rows[0] ? mapRow(rows[0]) : null;
  }

  async getStreamBySlug(
    slug: string,
    llm: "claude" | "grok" = "claude",
  ): Promise<StreamRecord | null> {
    const rows = (await this.sql`
      SELECT
        streams.id,
        streams.stub_id,
        stubs.slug AS stub_slug,
        streams.llm,
        streams.canon,
        streams.river,
        streams.created_at
      FROM streams
      INNER JOIN stubs ON stubs.id = streams.stub_id
      WHERE stubs.slug = ${slug} AND streams.llm = ${llm}
      LIMIT 1;
    `) as NeonStreamRecordRow[];

    if (rows.length > 0) {
      return mapStreamRow(rows[0]);
    }

    const stubRows = (await this.sql`
      SELECT id, slug
      FROM stubs
      WHERE slug = ${slug}
      LIMIT 1;
    `) as Array<{ id: string; slug: string }>;

    if (stubRows.length === 0) {
      return null;
    }

    const insertedRows = (await this.sql`
      INSERT INTO streams (stub_id, llm, canon, river)
      VALUES (${stubRows[0].id}, ${llm}, '[]'::jsonb, '')
      ON CONFLICT (stub_id, llm) DO UPDATE SET stub_id = EXCLUDED.stub_id
      RETURNING
        id,
        stub_id,
        ${stubRows[0].slug}::text AS stub_slug,
        llm,
        canon,
        river,
        created_at;
    `) as NeonStreamRecordRow[];

    return mapStreamRow(insertedRows[0]);
  }

  async getStreamById(streamId: string): Promise<StreamRecord | null> {
    const rows = (await this.sql`
      SELECT
        streams.id,
        streams.stub_id,
        stubs.slug AS stub_slug,
        streams.llm,
        streams.canon,
        streams.river,
        streams.created_at
      FROM streams
      INNER JOIN stubs ON stubs.id = streams.stub_id
      WHERE streams.id = ${streamId}
      LIMIT 1;
    `) as NeonStreamRecordRow[];

    return rows[0] ? mapStreamRow(rows[0]) : null;
  }

  async listStreamsBySlug(slug: string): Promise<StreamRecord[]> {
    const rows = (await this.sql`
      SELECT
        streams.id,
        streams.stub_id,
        stubs.slug AS stub_slug,
        streams.llm,
        streams.canon,
        streams.river,
        streams.created_at
      FROM streams
      INNER JOIN stubs ON stubs.id = streams.stub_id
      WHERE stubs.slug = ${slug}
      ORDER BY streams.created_at ASC;
    `) as NeonStreamRecordRow[];

    return rows.map(mapStreamRow);
  }

  async searchStreams(input: StreamSearchInput): Promise<StreamRecord[]> {
    const hasStreamId = Boolean(input.stream_id);
    const hasSlug = Boolean(input.slug_id);
    const hasRiver = Boolean(input.river);

    if (!hasStreamId && !hasSlug && !hasRiver) {
      return [];
    }

    const rows = (await this.sql`
      SELECT
        streams.id,
        streams.stub_id,
        stubs.slug AS stub_slug,
        streams.llm,
        streams.canon,
        streams.river,
        streams.created_at
      FROM streams
      INNER JOIN stubs ON stubs.id = streams.stub_id
      WHERE
        (${input.stream_id ?? ""}::text = '' OR streams.id = ${input.stream_id ?? ""})
        AND (${input.slug_id ?? ""}::text = '' OR stubs.slug = ${input.slug_id ?? ""})
        AND (${input.river ?? ""}::text = '' OR streams.river ILIKE ${`%${input.river ?? ""}%`})
      ORDER BY streams.created_at DESC
      LIMIT 25;
    `) as NeonStreamRecordRow[];

    return rows.map(mapStreamRow);
  }

  async listStreams(limit = 10): Promise<StreamRecord[]> {
    const rows = (await this.sql`
      SELECT
        streams.id,
        streams.stub_id,
        stubs.slug AS stub_slug,
        streams.llm,
        streams.canon,
        streams.river,
        streams.created_at
      FROM streams
      INNER JOIN stubs ON stubs.id = streams.stub_id
      ORDER BY streams.created_at DESC
      LIMIT ${limit};
    `) as NeonStreamRecordRow[];

    return rows.map(mapStreamRow);
  }

  async listStreamMessages(streamId: string): Promise<StreamMessageRecord[]> {
    const rows = (await this.sql`
      SELECT
        id,
        stream_id,
        role,
        session_id,
        uname,
        type,
        content,
        created_at
      FROM stream_msgs
      WHERE stream_id = ${streamId}
      ORDER BY created_at ASC;
    `) as NeonStreamMessageRow[];

    return rows.map(mapStreamMessageRow);
  }

  async createStreamMessage(
    streamId: string,
    role: "user" | "assistant",
    session_id: string | null,
    uname: string,
    type: string,
    content: string,
  ): Promise<StreamMessageRecord> {
    const rows = (await this.sql`
      INSERT INTO stream_msgs (stream_id, role, session_id, uname, type, content)
      VALUES (${streamId}, ${role}, ${session_id}, ${uname}, ${type}, ${content})
      RETURNING id, stream_id, role, session_id, uname, type, content, created_at;
    `) as NeonStreamMessageRow[];

    return mapStreamMessageRow(rows[0]);
  }

  async getPotState(): Promise<PotState> {
    const rows = (await this.sql`
      SELECT id, tokens_remaining, updated_at
      FROM pot
      WHERE id IN (1, 2)
      ORDER BY id ASC;
    `) as NeonPotRow[];

    let site: PotRecord | null = null;
    let research: PotRecord | null = null;
    for (const row of rows) {
      const mapped = mapPotRow(row);
      if (mapped.id === 1) site = mapped;
      if (mapped.id === 2) research = mapped;
    }
    return { site, research };
  }

  async chargeSitePotFromMessage(message: string): Promise<PotRecord | null> {
    const cost = sitePotCostFromMessage(message);
    if (cost <= 0) {
      const state = await this.getPotState();
      return state.site;
    }

    const rows = (await this.sql`
      UPDATE pot
      SET
        tokens_remaining = GREATEST(tokens_remaining - ${cost}, 0),
        updated_at = NOW()
      WHERE id = 1
      RETURNING id, tokens_remaining, updated_at;
    `) as NeonPotRow[];

    return rows[0] ? mapPotRow(rows[0]) : null;
  }

  async listBidsByStubId(stubId: string): Promise<BidRecord[]> {
    const rows = (await this.sql`
      SELECT
        id,
        stub_id,
        orcid,
        name,
        website,
        pitch,
        votes_for,
        votes_against,
        created_at
      FROM bids
      WHERE stub_id = ${stubId}
      ORDER BY created_at DESC;
    `) as NeonBidRow[];

    return rows.map(mapBidRow);
  }

  async createBid(input: CreateBidInput): Promise<BidRecord> {
    const name = (input.name ?? "").trim() || "";
    const pitch = (input.pitch ?? "").trim() || "";
    const website = input.website?.trim() || null;
    const votesFor = input.votes_for ?? 0;
    const votesAgainst = input.votes_against ?? 0;

    const rows = (await this.sql`
      INSERT INTO bids (
        stub_id,
        orcid,
        name,
        website,
        pitch,
        votes_for,
        votes_against
      )
      VALUES (
        ${input.stub_id},
        ${input.orcid.trim()},
        ${name},
        ${website},
        ${pitch},
        ${votesFor},
        ${votesAgainst}
      )
      RETURNING
        id,
        stub_id,
        orcid,
        name,
        website,
        pitch,
        votes_for,
        votes_against,
        created_at;
    `) as NeonBidRow[];

    return mapBidRow(rows[0]);
  }

  async applyBidVote(bidId: string, direction: BidVoteDirection): Promise<BidRecord | null> {
    let rows: NeonBidRow[];
    if (direction === "up") {
      rows = (await this.sql`
        UPDATE bids
        SET votes_for = GREATEST(votes_for, 0) + 1
        WHERE id = ${bidId}
        RETURNING
          id,
          stub_id,
          orcid,
          name,
          website,
          pitch,
          votes_for,
          votes_against,
          created_at;
      `) as NeonBidRow[];
    } else {
      rows = (await this.sql`
        UPDATE bids
        SET votes_against = GREATEST(votes_against, 0) + 1
        WHERE id = ${bidId}
        RETURNING
          id,
          stub_id,
          orcid,
          name,
          website,
          pitch,
          votes_for,
          votes_against,
          created_at;
      `) as NeonBidRow[];
    }

    return rows[0] ? mapBidRow(rows[0]) : null;
  }
}

export { INIT_SCHEMA_SQL };
