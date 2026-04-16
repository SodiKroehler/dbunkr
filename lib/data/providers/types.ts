export type DataProviderName = "neon";

export interface StubRecord {
  id: number;
  title: string;
  description: string;
  created_at: string;
  left_agree: number;
  right_agree: number;
  moderate_agree: number;
}

export interface CreateStubRecordInput {
  title: string;
  description: string;
  left_agree?: number;
  right_agree?: number;
  moderate_agree?: number;
}

export interface DataProvider {
  name: DataProviderName;
  initStubSchema(): Promise<void>;
  listStubRecords(): Promise<StubRecord[]>;
  createStubRecord(input: CreateStubRecordInput): Promise<StubRecord>;
}
