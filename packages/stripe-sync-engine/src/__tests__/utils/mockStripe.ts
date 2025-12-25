// @ts-nocheck
/// <reference types="vitest" />
import { vi } from 'vitest'

export type AsyncIterableLike<T> = AsyncIterable<T>

export function createAsyncIterable<T>(items: T[]): AsyncIterableLike<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item
      }
    },
  }
}

export function createStripeMock() {
  return {
    webhooks: {
      constructEventAsync: vi.fn(),
    },
    charges: {
      retrieve: vi.fn(),
    },
    customers: {
      retrieve: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
    subscriptionSchedules: {
      retrieve: vi.fn(),
    },
    subscriptionItems: {
      list: vi.fn(),
    },
    checkout: {
      sessions: {
        retrieve: vi.fn(),
        list: vi.fn(),
        listLineItems: vi.fn(() => createAsyncIterable<unknown>([])),
      },
    },
    invoices: {
      retrieve: vi.fn(),
      listLineItems: vi.fn(() => createAsyncIterable<unknown>([])),
    },
    refunds: {
      retrieve: vi.fn(),
      list: vi.fn(() => createAsyncIterable<unknown>([])),
    },
    disputes: {
      retrieve: vi.fn(),
    },
    creditNotes: {
      retrieve: vi.fn(),
      listLineItems: vi.fn(() => createAsyncIterable<unknown>([])),
    },
    products: {
      retrieve: vi.fn(),
    },
    prices: {
      retrieve: vi.fn(),
    },
    plans: {
      retrieve: vi.fn(),
    },
    paymentIntents: {
      retrieve: vi.fn(),
    },
    paymentMethods: {
      retrieve: vi.fn(),
      list: vi.fn(() => createAsyncIterable<unknown>([])),
    },
    setupIntents: {
      retrieve: vi.fn(),
    },
    taxIds: {
      retrieve: vi.fn(),
      list: vi.fn(() => createAsyncIterable<unknown>([])),
    },
    radar: {
      earlyFraudWarnings: {
        retrieve: vi.fn(),
        list: vi.fn(() => createAsyncIterable<unknown>([])),
      },
    },
    reviews: {
      retrieve: vi.fn(),
    },
    entitlements: {
      activeEntitlements: {
        list: vi.fn(() => createAsyncIterable<unknown>([])),
      },
      features: {
        retrieve: vi.fn(),
        list: vi.fn(() => createAsyncIterable<unknown>([])),
      },
    },
  }
}
