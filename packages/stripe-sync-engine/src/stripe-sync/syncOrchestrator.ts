import Stripe from 'stripe'
import { pg as sql } from 'yesql'
import { StripeSyncContext } from './types'
import { Sync, SyncBackfill, SyncBackfillParams, SyncEntitlementsParams, SyncFeaturesParams } from '../types'
import { chunkArray } from './utils'
import {
  upsertCharges,
  upsertCheckoutSessions,
  upsertCreditNotes,
  upsertCustomers,
  upsertDisputes,
  upsertEarlyFraudWarning,
  upsertInvoices,
  upsertPaymentIntents,
  upsertPaymentMethods,
  upsertPlans,
  upsertPrices,
  upsertProducts,
  upsertRefunds,
  upsertSetupIntents,
  upsertSubscriptions,
  upsertSubscriptionSchedules,
  upsertTaxIds,
  upsertFeatures,
  upsertActiveEntitlements,
} from './entity-upserts'

export async function syncBackfill(
  context: StripeSyncContext,
  params?: SyncBackfillParams
): Promise<SyncBackfill> {
  const { object } = params ?? {}
  let products: Sync | undefined,
    prices: Sync | undefined,
    customers: Sync | undefined,
    checkoutSessions: Sync | undefined,
    subscriptions: Sync | undefined,
    subscriptionSchedules: Sync | undefined,
    invoices: Sync | undefined,
    setupIntents: Sync | undefined,
    paymentMethods: Sync | undefined,
    disputes: Sync | undefined,
    charges: Sync | undefined,
    paymentIntents: Sync | undefined,
    plans: Sync | undefined,
    taxIds: Sync | undefined,
    creditNotes: Sync | undefined,
    earlyFraudWarnings: Sync | undefined,
    refunds: Sync | undefined

  switch (object) {
    case 'all':
      products = await syncProducts(context, params)
      prices = await syncPrices(context, params)
      plans = await syncPlans(context, params)
      customers = await syncCustomers(context, params)
      subscriptions = await syncSubscriptions(context, params)
      subscriptionSchedules = await syncSubscriptionSchedules(context, params)
      invoices = await syncInvoices(context, params)
      charges = await syncCharges(context, params)
      setupIntents = await syncSetupIntents(context, params)
      paymentMethods = await syncPaymentMethods(context, params)
      paymentIntents = await syncPaymentIntents(context, params)
      taxIds = await syncTaxIds(context, params)
      creditNotes = await syncCreditNotes(context, params)
      disputes = await syncDisputes(context, params)
      earlyFraudWarnings = await syncEarlyFraudWarnings(context, params)
      refunds = await syncRefunds(context, params)
      checkoutSessions = await syncCheckoutSessions(context, params)
      break
    case 'customer':
      customers = await syncCustomers(context, params)
      break
    case 'invoice':
      invoices = await syncInvoices(context, params)
      break
    case 'price':
      prices = await syncPrices(context, params)
      break
    case 'product':
      products = await syncProducts(context, params)
      break
    case 'subscription':
      subscriptions = await syncSubscriptions(context, params)
      break
    case 'subscription_schedules':
      subscriptionSchedules = await syncSubscriptionSchedules(context, params)
      break
    case 'setup_intent':
      setupIntents = await syncSetupIntents(context, params)
      break
    case 'payment_method':
      paymentMethods = await syncPaymentMethods(context, params)
      break
    case 'dispute':
      disputes = await syncDisputes(context, params)
      break
    case 'charge':
      charges = await syncCharges(context, params)
      break
    case 'payment_intent':
      paymentIntents = await syncPaymentIntents(context, params)
      break
    case 'plan':
      plans = await syncPlans(context, params)
      break
    case 'tax_id':
      taxIds = await syncTaxIds(context, params)
      break
    case 'credit_note':
      creditNotes = await syncCreditNotes(context, params)
      break
    case 'early_fraud_warning':
      earlyFraudWarnings = await syncEarlyFraudWarnings(context, params)
      break
    case 'refund':
      refunds = await syncRefunds(context, params)
      break
    case 'checkout_sessions':
      checkoutSessions = await syncCheckoutSessions(context, params)
      break
    default:
      break
  }

  return {
    products,
    prices,
    customers,
    checkoutSessions,
    subscriptions,
    subscriptionSchedules,
    invoices,
    setupIntents,
    paymentMethods,
    disputes,
    charges,
    paymentIntents,
    plans,
    taxIds,
    creditNotes,
    earlyFraudWarnings,
    refunds,
  }
}

export async function syncProducts(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing products')

  const params: Stripe.ProductListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams?.created

  return fetchAndUpsert(
    context,
    () => context.stripe.products.list(params),
    (products) => upsertProducts(context, products)
  )
}

export async function syncPrices(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing prices')

  const params: Stripe.PriceListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams?.created

  return fetchAndUpsert(
    context,
    () => context.stripe.prices.list(params),
    (prices) => upsertPrices(context, prices, syncParams?.backfillRelatedEntities)
  )
}

export async function syncPlans(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing plans')

  const params: Stripe.PlanListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams?.created

  return fetchAndUpsert(
    context,
    () => context.stripe.plans.list(params),
    (plans) => upsertPlans(context, plans, syncParams?.backfillRelatedEntities)
  )
}

export async function syncCustomers(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing customers')

  const params: Stripe.CustomerListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.customers.list(params),
    // @ts-expect-error
    (items) => upsertCustomers(context, items)
  )
}

export async function syncSubscriptions(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing subscriptions')

  const params: Stripe.SubscriptionListParams = { status: 'all', limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.subscriptions.list(params),
    (items) => upsertSubscriptions(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncSubscriptionSchedules(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing subscription schedules')

  const params: Stripe.SubscriptionScheduleListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.subscriptionSchedules.list(params),
    (items) => upsertSubscriptionSchedules(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncInvoices(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing invoices')

  const params: Stripe.InvoiceListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.invoices.list(params),
    (items) => upsertInvoices(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncCharges(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing charges')

  const params: Stripe.ChargeListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.charges.list(params),
    (items) => upsertCharges(context, items, syncParams?.backfillRelatedEntities) 
  )
}

export async function syncSetupIntents(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing setup_intents')

  const params: Stripe.SetupIntentListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.setupIntents.list(params),
    (items) => upsertSetupIntents(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncPaymentIntents(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing payment_intents')

  const params: Stripe.PaymentIntentListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.paymentIntents.list(params),
    (items) => upsertPaymentIntents(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncTaxIds(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing tax_ids')

  const params: Stripe.TaxIdListParams = { limit: 100 }

  return fetchAndUpsert(
    context,
    () => context.stripe.taxIds.list(params),
    (items) => upsertTaxIds(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncPaymentMethods(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing payment method')

  const prepared = sql(
    `select id from "${context.config.schema}"."customers" WHERE deleted <> true;`
  )([])

  const customerIds = await context.postgresClient
    .query(prepared.text, prepared.values)
    .then(({ rows }) => rows.map((it) => it.id))

  context.config.logger?.info(`Getting payment methods for ${customerIds.length} customers`)

  let synced = 0

  for (const customerIdChunk of chunkArray(customerIds, 10)) {
    await Promise.all(
      customerIdChunk.map(async (customerId) => {
        const syncResult = await fetchAndUpsert(
          context,
          () =>
            context.stripe.paymentMethods.list({
              limit: 100,
              customer: customerId,
            }),
          (items) => upsertPaymentMethods(context, items, syncParams?.backfillRelatedEntities)
        )

        synced += syncResult.synced
      })
    )
  }

  return { synced }
}

export async function syncDisputes(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  const params: Stripe.DisputeListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.disputes.list(params),
    (items) => upsertDisputes(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncEarlyFraudWarnings(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing early fraud warnings')

  const params: Stripe.Radar.EarlyFraudWarningListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.radar.earlyFraudWarnings.list(params),
    (items) => upsertEarlyFraudWarning(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncRefunds(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing refunds')

  const params: Stripe.RefundListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.refunds.list(params),
    (items) => upsertRefunds(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function syncCreditNotes(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing credit notes')

  const params: Stripe.CreditNoteListParams = { limit: 100 }
  if (syncParams?.created) params.created = syncParams?.created

  return fetchAndUpsert(
    context,
    () => context.stripe.creditNotes.list(params),
    (creditNotes) => upsertCreditNotes(context, creditNotes)
  )
}

export async function syncFeatures(
  context: StripeSyncContext,
  syncParams?: SyncFeaturesParams
): Promise<Sync> {
  context.config.logger?.info('Syncing features')
  const params: Stripe.Entitlements.FeatureListParams = { limit: 100, ...syncParams?.pagination }
  return fetchAndUpsert(
    context,
    () => context.stripe.entitlements.features.list(params),
    (features) => upsertFeatures(context, features)
  )
}

export async function syncEntitlements(
  context: StripeSyncContext,
  customerId: string,
  syncParams?: SyncEntitlementsParams
): Promise<Sync> {
  context.config.logger?.info('Syncing entitlements')
  const params: Stripe.Entitlements.ActiveEntitlementListParams = {
    customer: customerId,
    limit: 100,
    ...syncParams?.pagination,
  }
  return fetchAndUpsert(
    context,
    () => context.stripe.entitlements.activeEntitlements.list(params),
    (entitlements) => upsertActiveEntitlements(context, customerId, entitlements)
  )
}

export async function syncCheckoutSessions(
  context: StripeSyncContext,
  syncParams?: SyncBackfillParams
): Promise<Sync> {
  context.config.logger?.info('Syncing checkout sessions')

  const params: Stripe.Checkout.SessionListParams = {
    limit: 100,
  }
  if (syncParams?.created) params.created = syncParams.created

  return fetchAndUpsert(
    context,
    () => context.stripe.checkout.sessions.list(params),
    (items) => upsertCheckoutSessions(context, items, syncParams?.backfillRelatedEntities)
  )
}

export async function fetchAndUpsert<T>(
  context: StripeSyncContext,
  fetch: () => Stripe.ApiListPromise<T>,
  upsert: (items: T[]) => Promise<T[]>
): Promise<Sync> {
  const items: T[] = []

  context.config.logger?.info('Fetching items to sync from Stripe')
  for await (const item of fetch()) {
    items.push(item)
  }

  if (!items.length) return { synced: 0 }

  context.config.logger?.info(`Upserting ${items.length} items`)
  const chunkSize = 250
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)

    await upsert(chunk)
  }
  context.config.logger?.info('Upserted items')

  return { synced: items.length }
}

