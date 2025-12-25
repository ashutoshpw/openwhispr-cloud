import { vi } from 'vitest'

export function createPostgresClientMock() {
  return {
    upsertManyWithTimestampProtection: vi.fn(async (entities) => entities ?? []),
    delete: vi.fn(async () => true),
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    findMissingEntries: vi.fn(async () => []),
  }
}
