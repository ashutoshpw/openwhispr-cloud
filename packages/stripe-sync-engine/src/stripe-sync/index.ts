import Stripe from 'stripe'
import { PostgresClient } from '../database/postgres'
import {
  StripeSyncConfig,
  SyncBackfillParams,
  SyncBackfill,
  Sync,
  SyncEntitlementsParams,
  SyncFeaturesParams,
} from '../types'
import { StripeSyncContext } from './types'
import { processWebhook, processEvent } from './webhookHandlers'
import {
  syncBackfill,
  syncProducts,
  syncPrices,
  syncPlans,
  syncCustomers,
  syncSubscriptions,
  syncSubscriptionSchedules,
  syncInvoices,
  syncCharges,
  syncSetupIntents,
  syncPaymentIntents,
  syncTaxIds,
  syncPaymentMethods,
  syncDisputes,
  syncEarlyFraudWarnings,
  syncRefunds,
  syncCreditNotes,
  syncFeatures,
  syncEntitlements,
  syncCheckoutSessions,
} from './syncOrchestrator'
import {
  upsertCharges,
  upsertCheckoutSessions,
  upsertCreditNotes,
  upsertCustomers,
  upsertDisputes,
  upsertEarlyFraudWarning,
  upsertFeatures,
  upsertInvoices,
  upsertPaymentIntents,
  upsertPaymentMethods,
  upsertPlans,
  upsertPrices,
  upsertProducts,
  upsertRefunds,
  upsertReviews,
  upsertSetupIntents,
  upsertSubscriptions,
  upsertTaxIds,
} from './entity-upserts'
import type { PoolConfig } from 'pg'

const DEFAULT_SCHEMA = 'stripe'

export class StripeSync {
  stripe: Stripe
  postgresClient: PostgresClient
  private context: StripeSyncContext

  constructor(private config: StripeSyncConfig) {
    this.stripe = new Stripe(config.stripeSecretKey, {
      // @ts-expect-error
      apiVersion: config.stripeApiVersion,
      appInfo: {
        name: 'Stripe Postgres Sync',
      },
    })

    this.config.logger?.info(
      { autoExpandLists: config.autoExpandLists, stripeApiVersion: config.stripeApiVersion },
      'StripeSync initialized'
    )

    const poolConfig = config.poolConfig ?? ({} as PoolConfig)

    if (config.databaseUrl) {
      poolConfig.connectionString = config.databaseUrl
    }

    if (config.maxPostgresConnections) {
      poolConfig.max = config.maxPostgresConnections
    }

    if (poolConfig.max === undefined) {
      poolConfig.max = 10
    }

    if (poolConfig.keepAlive === undefined) {
      poolConfig.keepAlive = true
    }

    this.postgresClient = new PostgresClient({
      schema: config.schema || DEFAULT_SCHEMA,
      poolConfig,
    })

    this.context = {
      stripe: this.stripe,
      postgresClient: this.postgresClient,
      config: this.config,
    }
  }

  async processWebhook(payload: Buffer | string, signature: string | undefined) {
    return processWebhook(this.context, payload, signature)
  }

  async processEvent(event: Stripe.Event) {
    return processEvent(this.context, event)
  }

  async syncBackfill(params?: SyncBackfillParams): Promise<SyncBackfill> {
    return syncBackfill(this.context, params)
  }

  async syncProducts(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncProducts(this.context, syncParams)
  }

  async syncPrices(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncPrices(this.context, syncParams)
  }

  async syncPlans(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncPlans(this.context, syncParams)
  }

  async syncCustomers(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncCustomers(this.context, syncParams)
  }

  async syncSubscriptions(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncSubscriptions(this.context, syncParams)
  }

  async syncSubscriptionSchedules(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncSubscriptionSchedules(this.context, syncParams)
  }

  async syncInvoices(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncInvoices(this.context, syncParams)
  }

  async syncCharges(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncCharges(this.context, syncParams)
  }

  async syncSetupIntents(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncSetupIntents(this.context, syncParams)
  }

  async syncPaymentIntents(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncPaymentIntents(this.context, syncParams)
  }

  async syncTaxIds(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncTaxIds(this.context, syncParams)
  }

  async syncPaymentMethods(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncPaymentMethods(this.context, syncParams)
  }

  async syncDisputes(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncDisputes(this.context, syncParams)
  }

  async syncEarlyFraudWarnings(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncEarlyFraudWarnings(this.context, syncParams)
  }

  async syncRefunds(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncRefunds(this.context, syncParams)
  }

  async syncCreditNotes(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncCreditNotes(this.context, syncParams)
  }

  async syncFeatures(syncParams?: SyncFeaturesParams): Promise<Sync> {
    return syncFeatures(this.context, syncParams)
  }

  async syncEntitlements(customerId: string, syncParams?: SyncEntitlementsParams): Promise<Sync> {
    return syncEntitlements(this.context, customerId, syncParams)
  }

  async syncCheckoutSessions(syncParams?: SyncBackfillParams): Promise<Sync> {
    return syncCheckoutSessions(this.context, syncParams)
  }

  async syncSingleEntity(stripeId: string) {
    if (stripeId.startsWith('cus_')) {
      return this.stripe.customers.retrieve(stripeId).then((it) => {
        if (!it || it.deleted) return

        return upsertCustomers(this.context, [it])
      })
    } else if (stripeId.startsWith('in_')) {
      return this.stripe.invoices
        .retrieve(stripeId)
        .then((it) => upsertInvoices(this.context, [it]))
    } else if (stripeId.startsWith('price_')) {
      return this.stripe.prices.retrieve(stripeId).then((it) => upsertPrices(this.context, [it]))
    } else if (stripeId.startsWith('prod_')) {
      return this.stripe.products
        .retrieve(stripeId)
        .then((it) => upsertProducts(this.context, [it]))
    } else if (stripeId.startsWith('plan_')) {
      return this.stripe.plans
        .retrieve(stripeId)
        .then((it) => upsertPlans(this.context, [it]))
    } else if (stripeId.startsWith('sub_')) {
      return this.stripe.subscriptions
        .retrieve(stripeId)
        .then((it) => upsertSubscriptions(this.context, [it]))
    } else if (stripeId.startsWith('seti_')) {
      return this.stripe.setupIntents
        .retrieve(stripeId)
        .then((it) => upsertSetupIntents(this.context, [it]))
    } else if (stripeId.startsWith('pm_')) {
      return this.stripe.paymentMethods
        .retrieve(stripeId)
        .then((it) => upsertPaymentMethods(this.context, [it]))
    } else if (stripeId.startsWith('dp_') || stripeId.startsWith('du_')) {
      return this.stripe.disputes
        .retrieve(stripeId)
        .then((it) => upsertDisputes(this.context, [it]))
    } else if (stripeId.startsWith('ch_')) {
      return this.stripe.charges
        .retrieve(stripeId)
        .then((it) => upsertCharges(this.context, [it], true))
    } else if (stripeId.startsWith('pi_')) {
      return this.stripe.paymentIntents
        .retrieve(stripeId)
        .then((it) => upsertPaymentIntents(this.context, [it]))
    } else if (stripeId.startsWith('txi_')) {
      return this.stripe.taxIds.retrieve(stripeId).then((it) => upsertTaxIds(this.context, [it]))
    } else if (stripeId.startsWith('cn_')) {
      return this.stripe.creditNotes
        .retrieve(stripeId)
        .then((it) => upsertCreditNotes(this.context, [it]))
    } else if (stripeId.startsWith('issfr_')) {
      return this.stripe.radar.earlyFraudWarnings
        .retrieve(stripeId)
        .then((it) => upsertEarlyFraudWarning(this.context, [it]))
    } else if (stripeId.startsWith('prv_')) {
      return this.stripe.reviews
        .retrieve(stripeId)
        .then((it) => upsertReviews(this.context, [it]))
    } else if (stripeId.startsWith('re_')) {
      return this.stripe.refunds
        .retrieve(stripeId)
        .then((it) => upsertRefunds(this.context, [it]))
    } else if (stripeId.startsWith('feat_')) {
      return this.stripe.entitlements.features
        .retrieve(stripeId)
        .then((it) => upsertFeatures(this.context, [it]))
    } else if (stripeId.startsWith('cs_')) {
      return this.stripe.checkout.sessions
        .retrieve(stripeId)
        .then((it) => upsertCheckoutSessions(this.context, [it]))
    }
  }
}

