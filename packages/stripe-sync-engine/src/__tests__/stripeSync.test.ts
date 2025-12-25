// @ts-nocheck
/// <reference types="vitest" />

import Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StripeSync } from '../stripe-sync'
import type { StripeSyncConfig } from '../types'
import { createStripeMock, createAsyncIterable } from './utils/mockStripe'
import {
  createActiveEntitlementSummary,
  createCharge,
  createCheckoutSession,
  createCreditNote,
  createCustomer,
  createDeletedCustomer,
  createDispute,
  createEarlyFraudWarning,
  createInvoice,
  createLineItem,
  createPaymentIntent,
  createPaymentMethod,
  createPlan,
  createPrice,
  createProduct,
  createRefund,
  createReview,
  createSetupIntent,
  createStripeEvent,
  createSubscription,
  createSubscriptionSchedule,
  createTaxId,
} from './utils/fixtures'

const pgMem = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { newDb } = require('pg-mem')
  const fs = require('node:fs')
  const path = require('node:path')

  const state = {
    db: null as ReturnType<typeof newDb> | null,
  }

  const applyMigrations = (db: ReturnType<typeof newDb>) => {
    const migrationsDir = path.resolve(__dirname, '../database/migrations')
    const files = fs.readdirSync(migrationsDir).sort()

    for (const file of files) {
      const rawSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
      if (!rawSql.trim()) continue
      const sanitized = rawSql
        .replace(/DO\s+\$\$[\s\S]*?\$\$;/gim, '')
        .replace(/CREATE FUNCTION[\s\S]*?\$\$[\s\S]*?\$\$\s*;?/gim, '')
        .replace(/CREATE\s+OR\s+REPLACE\s+FUNCTION[\s\S]*?\$\$[\s\S]*?\$\$\s*;?/gim, '')
        .replace(/LANGUAGE\s+plpgsql\s*;?/gi, '')
        .replace(/CREATE TRIGGER[\s\S]*?;/gim, '')
        .replace(/\s*WITH[\s\S]*?jsonb_array_elements[\s\S]*?;/gim, '')
        .replace(/--.*$/gm, '')
        .replace(/references\s+"?stripe"?\."?([a-z_]+)"?\(id\)/gi, '')
        .replace(/references\s+"?stripe"?\."?([a-z_]+)"?/gi, '')
        .replace(/\s+on delete cascade/gi, '')
        .replace(/("[^"]+"\s+)"stripe"\."([a-z_]+)"/gi, '$1text')
        .replace(/,\s*\n\)/g, '\n)')
        .replace(/\n\s*\n/g, '\n')
        .trim()
      if (!sanitized) {
        continue
      }

      const statements = sanitized
        .replace(/ALTER FUNCTION[\s\S]*?;/gim, '')
        .split(';')
        .map((statement: string) => statement.trim())
        .filter(Boolean)

      for (const statement of statements) {
        if (statement.toLowerCase().includes('jsonb_array_elements')) {
          continue
        }
        if (statement.toLowerCase().includes('alter table') && statement.toLowerCase().includes('if exists')) {
          continue
        }
        if (statement.toLowerCase().includes('<> all(')) {
          continue
        }
        db.public.none(statement)
      }
    }
  }

  return {
    reset() {
      const db = newDb({ autoCreateForeignKeyIndices: true })
      db.public.none('CREATE SCHEMA IF NOT EXISTS stripe;')
      db.public.registerFunction({
        name: 'timezone',
        args: ['text', 'timestamptz'],
        returns: 'timestamptz',
        implementation: (_zone: string, timestamp: Date | null) => timestamp ?? new Date(),
      })
      db.public.registerFunction({
        name: 'timezone',
        args: ['text', 'timestamp'],
        returns: 'timestamp',
        implementation: (_zone: string, timestamp: Date | null) => timestamp ?? new Date(),
      })
      db.public.none(`
        CREATE TYPE "stripe"."pricing_type" AS ENUM ('one_time', 'recurring');
        CREATE TYPE "stripe"."pricing_tiers" AS ENUM ('graduated', 'volume');
        CREATE TYPE "stripe"."subscription_status" AS ENUM (
          'trialing',
          'active',
          'canceled',
          'incomplete',
          'incomplete_expired',
          'past_due',
          'unpaid'
        );
        CREATE TYPE "stripe"."invoice_status" AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
        CREATE TYPE "stripe"."subscription_schedule_status" AS ENUM ('not_started', 'active', 'completed', 'released', 'canceled');
      `)
      applyMigrations(db)
      try {
        db.public.none(
          'ALTER TABLE "stripe"."subscription_schedules" ALTER COLUMN created DROP NOT NULL'
        )
      } catch (_error) {
        // ignore
      }
      try {
        db.public.none(
          'ALTER TABLE "stripe"."subscription_schedules" ALTER COLUMN created SET DEFAULT extract(epoch from now())::int'
        )
      } catch (_error) {
        // ignore
      }
      try {
        db.public.none(
          'ALTER TABLE "stripe"."products" ADD COLUMN IF NOT EXISTS marketing_features jsonb'
        )
      } catch (_error) {
        // ignore
      }
      state.db = db
      return db
    },
    getDb() {
      if (!state.db) {
        throw new Error('pg-mem database not initialized. Call reset() first.')
      }
      return state.db
    },
    getAdapter() {
      if (!state.db) {
        throw new Error('pg-mem database not initialized. Call reset() first.')
      }
      return state.db.adapters.createPg()
    },
  }
})

vi.mock('pg', () => {
  const { getAdapter } = pgMem

  class Pool {
    constructor(config?: unknown) {
      const adapter = getAdapter()
      return new adapter.Pool(config as never)
    }
  }

  class Client {
    constructor(config?: unknown) {
      const adapter = getAdapter()
      return new adapter.Client(config as never)
    }
  }

  return {
    __esModule: true,
    default: { Pool, Client },
    Pool,
    Client,
  }
})

const BASE_CONFIG: StripeSyncConfig = {
  stripeSecretKey: 'sk_test',
  stripeWebhookSecret: 'whsec_test',
  poolConfig: {},
  autoExpandLists: false,
  backfillRelatedEntities: false,
  schema: 'stripe',
}

async function queryTable(stripeSync: StripeSync, table: string) {
  return stripeSync.postgresClient.pool.query(`select * from "stripe"."${table}"`)
}

function setupSync(configOverride: Partial<StripeSyncConfig> = {}) {
  pgMem.reset()

  const stripeSync = new StripeSync({ ...BASE_CONFIG, ...configOverride, schema: 'stripe' })
  const stripeMock = createStripeMock()

  stripeSync.stripe = stripeMock as unknown as Stripe
  ;(stripeSync as unknown as { context: { stripe: Stripe } }).context.stripe =
    stripeMock as unknown as Stripe

  return { stripeSync, stripeMock }
}

describe('StripeSync.processWebhook with pg-mem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    'charge.succeeded',
    'charge.failed',
    'charge.captured',
    'charge.refunded',
  ])('persists charges for %s', async (type) => {
    const charge = createCharge()
    const event = createStripeEvent(type as Stripe.Event.Type, charge)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'charges')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(charge.id)
  })

  it.each(['customer.created', 'customer.updated'])(
    'persists customers for %s',
    async (type) => {
      const customer = createCustomer()
      const event = createStripeEvent(type as Stripe.Event.Type, customer)
      const { stripeSync, stripeMock } = setupSync()

      stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

      await stripeSync.processWebhook('payload', 'sig')

      const { rows } = await queryTable(stripeSync, 'customers')
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(customer.id)
    }
  )

  it('stores deleted customers for customer.deleted', async () => {
    const customer = createDeletedCustomer()
    const event = createStripeEvent('customer.deleted', customer)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'customers')
    expect(rows).toHaveLength(1)
    expect(rows[0].deleted).toBe(true)
  })

  it.each([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ])('persists subscriptions for %s', async (type) => {
    const subscription = createSubscription()
    const event = createStripeEvent(type as Stripe.Event.Type, subscription)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const subscriptions = await queryTable(stripeSync, 'subscriptions')
    expect(subscriptions.rows).toHaveLength(1)
    expect(subscriptions.rows[0].id).toBe(subscription.id)

    const items = await queryTable(stripeSync, 'subscription_items')
    expect(items.rows).toHaveLength(subscription.items.data.length)
  })

  it.each(['invoice.created', 'invoice.paid', 'invoice.payment_failed'])(
    'persists invoices for %s',
    async (type) => {
      const invoice = createInvoice()
      const event = createStripeEvent(type as Stripe.Event.Type, invoice)
      const { stripeSync, stripeMock } = setupSync()

      stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

      await stripeSync.processWebhook('payload', 'sig')

      const { rows } = await queryTable(stripeSync, 'invoices')
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(invoice.id)
    }
  )

  it.each(['payment_intent.succeeded', 'payment_intent.canceled'])(
    'persists payment intents for %s',
    async (type) => {
      const paymentIntent = createPaymentIntent({
        status: type.endsWith('canceled') ? 'canceled' : 'succeeded',
      })
      const event = createStripeEvent(type as Stripe.Event.Type, paymentIntent)
      const { stripeSync, stripeMock } = setupSync()

      stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

      await stripeSync.processWebhook('payload', 'sig')

      const { rows } = await queryTable(stripeSync, 'payment_intents')
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(paymentIntent.id)
    }
  )

  it('persists setup intents for setup_intent.succeeded', async () => {
    const setupIntent = createSetupIntent()
    const event = createStripeEvent('setup_intent.succeeded', setupIntent)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'setup_intents')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(setupIntent.id)
  })

  it('persists disputes for charge.dispute.created', async () => {
    const dispute = createDispute()
    const event = createStripeEvent('charge.dispute.created', dispute)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'disputes')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(dispute.id)
  })

  it('persists refunds for refund.created', async () => {
    const refund = createRefund()
    const event = createStripeEvent('refund.created', refund)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'refunds')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(refund.id)
  })

  it('persists checkout sessions and line items for checkout.session.completed', async () => {
    const session = createCheckoutSession()
    const lineItem = createLineItem()
    const event = createStripeEvent('checkout.session.completed', session)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.prices.retrieve.mockResolvedValue(createPrice())
    stripeMock.products.retrieve.mockResolvedValue(createProduct())

    stripeMock.checkout.sessions.listLineItems.mockReturnValue(createAsyncIterable([lineItem]))
    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const sessions = await queryTable(stripeSync, 'checkout_sessions')
    expect(sessions.rows).toHaveLength(1)
    expect(sessions.rows[0].id).toBe(session.id)

    const items = await queryTable(stripeSync, 'checkout_session_line_items')
    expect(items.rows).toHaveLength(1)
    expect(items.rows[0].checkout_session).toBe(session.id)
  })

  it('persists credit notes for credit_note.created', async () => {
    const creditNote = createCreditNote()
    const event = createStripeEvent('credit_note.created', creditNote)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'credit_notes')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(creditNote.id)
  })

  it('persists tax ids for customer.tax_id.created', async () => {
    const taxId = createTaxId()
    const event = createStripeEvent('customer.tax_id.created', taxId)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'tax_ids')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(taxId.id)
  })

  it('deletes tax ids for customer.tax_id.deleted', async () => {
    const taxId = createTaxId()
    const { stripeSync, stripeMock } = setupSync()

    // Seed
    stripeMock.webhooks.constructEventAsync.mockResolvedValue(
      createStripeEvent('customer.tax_id.created', taxId)
    )
    await stripeSync.processWebhook('payload', 'sig')

    const deleteEvent = createStripeEvent('customer.tax_id.deleted', taxId)
    stripeMock.webhooks.constructEventAsync.mockResolvedValue(deleteEvent)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'tax_ids')
    expect(rows).toHaveLength(0)
  })

  it('persists payment methods for payment_method.attached', async () => {
    const paymentMethod = createPaymentMethod()
    const event = createStripeEvent('payment_method.attached', paymentMethod)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'payment_methods')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(paymentMethod.id)
  })

  it('persists subscription schedules for subscription_schedule.created', async () => {
    const schedule = createSubscriptionSchedule()
    const event = createStripeEvent('subscription_schedule.created', schedule)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'subscription_schedules')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(schedule.id)
  })

  it.each(['product.created', 'product.updated'])(
    'persists products for %s',
    async (type) => {
      const product = createProduct()
      const event = createStripeEvent(type as Stripe.Event.Type, product)
      const { stripeSync, stripeMock } = setupSync()

      stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

      await stripeSync.processWebhook('payload', 'sig')

      const { rows } = await queryTable(stripeSync, 'products')
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(product.id)
    }
  )

  it('deletes products for product.deleted', async () => {
    const product = createProduct()
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(
      createStripeEvent('product.created', product)
    )
    await stripeSync.processWebhook('payload', 'sig')

    const deleteEvent = createStripeEvent('product.deleted', product)
    stripeMock.webhooks.constructEventAsync.mockResolvedValue(deleteEvent)
    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'products')
    expect(rows).toHaveLength(0)
  })

  it.each(['price.created', 'price.updated'])(
    'persists prices for %s',
    async (type) => {
      const price = createPrice()
      const event = createStripeEvent(type as Stripe.Event.Type, price)
      const { stripeSync, stripeMock } = setupSync()

      stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

      await stripeSync.processWebhook('payload', 'sig')

      const { rows } = await queryTable(stripeSync, 'prices')
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(price.id)
    }
  )

  it('deletes prices for price.deleted', async () => {
    const price = createPrice()
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(
      createStripeEvent('price.created', price)
    )
    await stripeSync.processWebhook('payload', 'sig')

    const deleteEvent = createStripeEvent('price.deleted', price)
    stripeMock.webhooks.constructEventAsync.mockResolvedValue(deleteEvent)
    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'prices')
    expect(rows).toHaveLength(0)
  })

  it.each(['plan.created', 'plan.updated'])(
    'persists plans for %s',
    async (type) => {
      const plan = createPlan()
      const event = createStripeEvent(type as Stripe.Event.Type, plan)
      const { stripeSync, stripeMock } = setupSync()

      stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

      await stripeSync.processWebhook('payload', 'sig')

      const { rows } = await queryTable(stripeSync, 'plans')
      expect(rows).toHaveLength(1)
      expect(rows[0].id).toBe(plan.id)
    }
  )

  it('deletes plans for plan.deleted', async () => {
    const plan = createPlan()
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(
      createStripeEvent('plan.created', plan)
    )
    await stripeSync.processWebhook('payload', 'sig')

    const deleteEvent = createStripeEvent('plan.deleted', plan)
    stripeMock.webhooks.constructEventAsync.mockResolvedValue(deleteEvent)
    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'plans')
    expect(rows).toHaveLength(0)
  })

  it('persists early fraud warnings for radar.early_fraud_warning.created', async () => {
    const warning = createEarlyFraudWarning()
    const event = createStripeEvent('radar.early_fraud_warning.created', warning)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'early_fraud_warnings')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(warning.id)
  })

  it('persists reviews for review.opened', async () => {
    const review = createReview()
    const event = createStripeEvent('review.opened', review)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'reviews')
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(review.id)
  })

  it('persists active entitlements for entitlements.active_entitlement_summary.updated', async () => {
    const summary = createActiveEntitlementSummary()
    const event = createStripeEvent('entitlements.active_entitlement_summary.updated', summary)
    const { stripeSync, stripeMock } = setupSync()

    const originalQuery = stripeSync.postgresClient.query.bind(stripeSync.postgresClient)
    vi.spyOn(stripeSync.postgresClient, 'query').mockImplementation((text, params) => {
      if (typeof text === 'string' && text.includes('<> ALL(')) {
        return Promise.resolve({ rows: [], rowCount: 0, command: 'DELETE', oid: 0, fields: [] })
      }
      return originalQuery(text as string, params as never)
    })

    stripeMock.entitlements.activeEntitlements.list.mockReturnValueOnce(
      createAsyncIterable(summary.entitlements.data)
    )

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const { rows } = await queryTable(stripeSync, 'active_entitlements')
    expect(rows).toHaveLength(summary.entitlements.data.length)
    expect(rows.map((row) => row.customer)).toContain(summary.customer)
  })

  it('throws for unhandled webhook events', async () => {
    const event = createStripeEvent('any.unhandled' as Stripe.Event.Type, { id: 'obj' })
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await expect(stripeSync.processWebhook('payload', 'sig')).rejects.toThrow(
      'Unhandled webhook event'
    )
  })

  it('leaves database empty for unrelated tables when processing single event', async () => {
    const charge = createCharge()
    const event = createStripeEvent('charge.succeeded', charge)
    const { stripeSync, stripeMock } = setupSync()

    stripeMock.webhooks.constructEventAsync.mockResolvedValue(event)

    await stripeSync.processWebhook('payload', 'sig')

    const db = pgMem.getDb()
    const products = db.public.many(`select * from "stripe"."products"`)
    expect(products).toHaveLength(0)
  })
})
