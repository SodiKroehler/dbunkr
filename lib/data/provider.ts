import { NeonDataProvider } from "@/lib/data/providers/neonProvider";
import type { DataProvider } from "@/lib/data/providers/types";

function getProviderName(): string {
  return process.env.DATA_PROVIDER?.trim().toLowerCase() || "neon";
}

export function createDataProvider(): DataProvider {
  const providerName = getProviderName();
  const databaseUrl = process.env.DATABASE_URL;

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
