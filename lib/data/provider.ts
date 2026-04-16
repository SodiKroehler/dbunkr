import { NeonDataProvider } from "@/lib/data/providers/neonProvider";
import type {
  DataProvider,
  StreamSearchInput,
  StubVoteType,
} from "@/lib/data/providers/types";

function getProviderName(): string {
  return process.env.DATA_PROVIDER?.trim().toLowerCase() || "neon";
}

export function createDataProvider(): DataProvider {
  const providerName = getProviderName();
  const databaseUrl = process.env.DBUNKR_NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }

  if (providerName === "neon") {
    return new NeonDataProvider(databaseUrl);
  }

  throw new Error(
    `Unsupported data provider "${providerName}". Set DATA_PROVIDER=neon.`,
  );
}

export async function initDataProviderSchema(): Promise<void> {
  const provider = createDataProvider();
  await provider.initStubSchema();
}

export async function listStubRecords() {
  const provider = createDataProvider();
  return provider.listStubRecords();
}

export async function listOpenStubRecords() {
  const provider = createDataProvider();
  return provider.listOpenStubs();
}

export async function matchStubRecords(query: string) {
  const provider = createDataProvider();
  return provider.matchStubs(query);
}

export async function getStubBySlug(slug: string) {
  const provider = createDataProvider();
  return provider.getStubBySlug(slug);
}

export async function getStreamBySlug(slug: string, llm?: "claude" | "grok") {
  const provider = createDataProvider();
  return provider.getStreamBySlug(slug, llm);
}

export async function getStreamById(streamId: string) {
  const provider = createDataProvider();
  return provider.getStreamById(streamId);
}

export async function listStreamsBySlug(slug: string) {
  const provider = createDataProvider();
  return provider.listStreamsBySlug(slug);
}

export async function searchStreams(input: StreamSearchInput) {
  const provider = createDataProvider();
  return provider.searchStreams(input);
}

export async function listStreams(limit?: number) {
  const provider = createDataProvider();
  return provider.listStreams(limit);
}

export async function listStreamMessages(streamId: string) {
  const provider = createDataProvider();
  return provider.listStreamMessages(streamId);
}

export async function createStreamMessage(
  streamId: string,
  role: "user" | "assistant",
  session_id: string | null,
  uname: string,
  type: string,
  content: string,
) {
  const provider = createDataProvider();
  return provider.createStreamMessage(streamId, role, session_id, uname, type, content);
}

export async function getPot() {
  const provider = createDataProvider();
  return provider.getPot();
}

export async function applyStubVoteRecord(stubId: string, voteType: StubVoteType) {
  const provider = createDataProvider();
  return provider.applyStubVote(stubId, voteType);
}
