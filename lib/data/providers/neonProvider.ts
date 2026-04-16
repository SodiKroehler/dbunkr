import { neon } from "@neondatabase/serverless";
import type {
  CreateStubRecordInput,
  DataProvider,
  StreamCanonMessage,
  StreamMessageRecord,
  PotRecord,
  StreamRecord,
  StreamSearchInput,
  StubRecord,
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
`;

type NeonStubRecordRow = {
  id: string;
  slug: string;
  rq: string;
  blurb: string | null;
  status: "seeded" | "proposed" | "approved";
  created_at: string | Date;
};

function mapRow(row: NeonStubRecordRow): StubRecord {
  return {
    id: row.id,
    slug: row.slug,
    rq: row.rq,
    blurb: row.blurb,
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
  content: string;
  created_at: string | Date;
};

type NeonPotRow = {
  id: number;
  tokens_remaining: number | string;
  updated_at: string | Date;
};

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
    const rows = (await this.sql`
      SELECT
        id,
        slug,
        rq,
        blurb,
        status,
        created_at
      FROM stubs
      ORDER BY created_at DESC;
    `) as NeonStubRecordRow[];

    return rows.map(mapRow);
  }

  async getStubBySlug(slug: string): Promise<StubRecord | null> {
    const rows = (await this.sql`
      SELECT
        id,
        slug,
        rq,
        blurb,
        status,
        created_at
      FROM stubs
      WHERE slug = ${slug}
      LIMIT 1;
    `) as NeonStubRecordRow[];

    return rows[0] ? mapRow(rows[0]) : null;
  }

  async createStubRecord(input: CreateStubRecordInput): Promise<StubRecord> {
    const rows = (await this.sql`
      INSERT INTO stubs (
        slug,
        rq,
        blurb,
        status
      )
      VALUES (
        ${input.slug},
        ${input.rq},
        ${input.blurb ?? null},
        ${input.status ?? "proposed"}
      )
      RETURNING
        id,
        slug,
        rq,
        blurb,
        status,
        created_at;
    `) as NeonStubRecordRow[];

    return mapRow(rows[0]);
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
    content: string,
  ): Promise<StreamMessageRecord> {
    const rows = (await this.sql`
      INSERT INTO stream_msgs (stream_id, role, session_id, uname, content)
      VALUES (${streamId}, ${role}, ${session_id}, ${uname}, ${content})
      RETURNING id, stream_id, role, session_id, uname, content, created_at;
    `) as NeonStreamMessageRow[];

    return mapStreamMessageRow(rows[0]);
  }

  async getPot(): Promise<PotRecord | null> {
    const rows = (await this.sql`
      SELECT id, tokens_remaining, updated_at
      FROM pot
      WHERE id = 1
      LIMIT 1;
    `) as NeonPotRow[];

    return rows[0] ? mapPotRow(rows[0]) : null;
  }
}

export { INIT_SCHEMA_SQL };
