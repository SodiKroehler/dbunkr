export type DataProviderName = "neon";

/** Stub counter updates via POST /api/v1/vote (no separate votes table). */
export const STUB_VOTE_TYPES = [
  "close_forward",
  "importance_forward",
  "importance_backward",
] as const;
export type StubVoteType = (typeof STUB_VOTE_TYPES)[number];

export function isStubVoteType(value: string): value is StubVoteType {
  return (STUB_VOTE_TYPES as readonly string[]).includes(value);
}

export interface StubRecord {
  id: string;
  slug: string;
  rq: string;
  blurb: string | null;
  left_truth: number;
  right_truth: number;
  center_truth: number;
  close_votes: number;
  importance_level: number;
  status: string;
  created_at: string;
}

export interface CreateStubRecordInput {
  slug: string;
  rq: string;
  blurb?: string | null;
  left_truth?: number;
  right_truth?: number;
  center_truth?: number;
  close_votes?: number;
  importance_level?: number;
  status?: string;
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

export interface BidRecord {
  id: string;
  stub_id: string;
  orcid: string;
  name: string;
  website: string | null;
  pitch: string;
  votes_for: number;
  votes_against: number;
  created_at: string;
}

export interface CreateBidInput {
  stub_id: string;
  orcid: string;
  name?: string;
  website?: string | null;
  pitch?: string;
  votes_for?: number;
  votes_against?: number;
}

export interface DataProvider {
  name: DataProviderName;
  initStubSchema(): Promise<void>;
  listStubRecords(): Promise<StubRecord[]>;
  listOpenStubs(): Promise<StubRecord[]>;
  matchStubs(query: string): Promise<StubRecord[]>;
  getStubBySlug(slug: string): Promise<StubRecord | null>;
  createStubRecord(input: CreateStubRecordInput): Promise<StubRecord>;
  applyStubVote(stubId: string, voteType: StubVoteType): Promise<StubRecord | null>;
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
  listBidsByStubId(stubId: string): Promise<BidRecord[]>;
  createBid(input: CreateBidInput): Promise<BidRecord>;
}
