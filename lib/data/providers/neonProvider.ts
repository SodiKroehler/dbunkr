import { neon } from "@neondatabase/serverless";
import type {
  CreateStubRecordInput,
  DataProvider,
  StubRecord,
} from "@/lib/data/providers/types";

const INIT_STUB_SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS stub;
`;

const INIT_STUB_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS stub.entries (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_agree INTEGER NOT NULL DEFAULT 0,
  right_agree INTEGER NOT NULL DEFAULT 0,
  moderate_agree INTEGER NOT NULL DEFAULT 0
);
`;

type NeonStubRecordRow = {
  id: string | number;
  title: string;
  description: string;
  created_at: string | Date;
  left_agree: string | number;
  right_agree: string | number;
  moderate_agree: string | number;
};

function mapRow(row: NeonStubRecordRow): StubRecord {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    left_agree: Number(row.left_agree),
    right_agree: Number(row.right_agree),
    moderate_agree: Number(row.moderate_agree),
  };
}

export class NeonDataProvider implements DataProvider {
  public readonly name = "neon" as const;
  private readonly sql;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  async initStubSchema(): Promise<void> {
    await this.sql.query(INIT_STUB_SCHEMA_SQL);
    await this.sql.query(INIT_STUB_TABLE_SQL);
  }

  async listStubRecords(): Promise<StubRecord[]> {
    const rows = (await this.sql`
      SELECT
        id,
        title,
        description,
        created_at,
        left_agree,
        right_agree,
        moderate_agree
      FROM stub.entries
      ORDER BY created_at DESC;
    `) as NeonStubRecordRow[];

    return rows.map(mapRow);
  }

  async createStubRecord(input: CreateStubRecordInput): Promise<StubRecord> {
    const rows = (await this.sql`
      INSERT INTO stub.entries (
        title,
        description,
        left_agree,
        right_agree,
        moderate_agree
      )
      VALUES (
        ${input.title},
        ${input.description},
        ${input.left_agree ?? 0},
        ${input.right_agree ?? 0},
        ${input.moderate_agree ?? 0}
      )
      RETURNING
        id,
        title,
        description,
        created_at,
        left_agree,
        right_agree,
        moderate_agree;
    `) as NeonStubRecordRow[];

    return mapRow(rows[0]);
  }
}

export { INIT_STUB_SCHEMA_SQL, INIT_STUB_TABLE_SQL };
