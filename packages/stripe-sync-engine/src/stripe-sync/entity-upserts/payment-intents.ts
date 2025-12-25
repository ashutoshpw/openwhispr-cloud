import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { paymentIntentSchema } from '../../schemas/payment_intent'
import { getUniqueIds, fetchMissingEntities } from '../utils'
import { backfillCustomers } from './customers'
import { backfillInvoices } from './invoices'

export async function upsertPaymentIntents(
  context: StripeSyncContext,
  paymentIntents: Stripe.PaymentIntent[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.PaymentIntent[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await Promise.all([
      backfillCustomers(context, getUniqueIds(paymentIntents, 'customer')),
      backfillInvoices(context, getUniqueIds(paymentIntents, 'invoice')),
    ])
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    paymentIntents as unknown as Record<string, unknown>[],
    'payment_intents',
    paymentIntentSchema,
    syncTimestamp
  ) as unknown as Stripe.PaymentIntent[];
}

export async function backfillPaymentIntents(
  context: StripeSyncContext,
  paymentIntentIds: string[]
) {
  const missingIds = await context.postgresClient.findMissingEntries(
    'payment_intents',
    paymentIntentIds
  )

  await fetchMissingEntities(missingIds, (id) =>
    context.stripe.paymentIntents.retrieve(id)
  ).then((paymentIntents) => upsertPaymentIntents(context, paymentIntents))
}

