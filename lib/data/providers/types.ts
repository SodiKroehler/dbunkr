export type DataProviderName = "neon";

export interface StubRecord {
  id: string;
  slug: string;
  rq: string;
  blurb: string | null;
  type: string | null;
  left_truth: number;
  right_truth: number;
  center_truth: number;
  status: "seeded" | "proposed" | "approved";
  created_at: string;
}

export interface CreateStubRecordInput {
  slug: string;
  rq: string;
  blurb?: string | null;
  type?: string | null;
  left_truth?: number;
  right_truth?: number;
  center_truth?: number;
  status?: "seeded" | "proposed" | "approved";
}

export interface StreamCanonMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamRecord {
  id: string;
  stub_id: string;
  stub_slug: string;
  llm: "claude" | "grok";
  canon: StreamCanonMessage[];
  river: string;
  created_at: string;
}

export interface StreamMessageRecord {
  id: string;
  stream_id: string;
  role: "user" | "assistant";
  session_id: string | null;
  uname: string;
  type: string;
  content: string;
  created_at: string;
}

export interface StreamSearchInput {
  stream_id?: string;
  slug_id?: string;
  river?: string;
}

export interface PotRecord {
  id: number;
  tokens_remaining: number;
  updated_at: string;
}

export interface DataProvider {
  name: DataProviderName;
  initStubSchema(): Promise<void>;
  listStubRecords(): Promise<StubRecord[]>;
  listOpenStubs(): Promise<StubRecord[]>;
  matchStubs(query: string): Promise<StubRecord[]>;
  getStubBySlug(slug: string): Promise<StubRecord | null>;
  createStubRecord(input: CreateStubRecordInput): Promise<StubRecord>;
  getStreamBySlug(slug: string, llm?: "claude" | "grok"): Promise<StreamRecord | null>;
  listStreamsBySlug(slug: string): Promise<StreamRecord[]>;
  getStreamById(streamId: string): Promise<StreamRecord | null>;
  searchStreams(input: StreamSearchInput): Promise<StreamRecord[]>;
  listStreams(limit?: number): Promise<StreamRecord[]>;
  listStreamMessages(streamId: string): Promise<StreamMessageRecord[]>;
  createStreamMessage(
    streamId: string,
    role: "user" | "assistant",
    session_id: string | null,
    uname: string,
    type: string,
    content: string,
  ): Promise<StreamMessageRecord>;
  getPot(): Promise<PotRecord | null>;
}
