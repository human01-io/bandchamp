export interface Collection {
  id: string;
  name: string;
  bandcampUsername?: string;
  albumIds: string[];
  createdAt: string;
  lastSyncAt?: string;
}
