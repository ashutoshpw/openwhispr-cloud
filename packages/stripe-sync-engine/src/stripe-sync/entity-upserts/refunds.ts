import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { refundSchema } from '../../schemas/refund'
import { getUniqueIds } from '../utils'
import { backfillPaymentIntents } from './payment-intents'
import { backfillCharges } from './charges'

export async function upsertRefunds(
  context: StripeSyncContext,
  refunds: Stripe.Refund[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Refund[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await Promise.all([
      backfillPaymentIntents(context, getUniqueIds(refunds, 'payment_intent')),
      backfillCharges(context, getUniqueIds(refunds, 'charge')),
    ])
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    refunds as unknown as Record<string, unknown>[],
    'refunds',
    refundSchema,
    syncTimestamp
  ) as unknown as Stripe.Refund[];
}

