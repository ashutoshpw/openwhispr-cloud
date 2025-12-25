import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { reviewSchema } from '../../schemas/review'
import { getUniqueIds } from '../utils'
import { backfillPaymentIntents } from './payment-intents'
import { backfillCharges } from './charges'

export async function upsertReviews(
  context: StripeSyncContext,
  reviews: Stripe.Review[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Review[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await Promise.all([
      backfillPaymentIntents(context, getUniqueIds(reviews, 'payment_intent')),
      backfillCharges(context, getUniqueIds(reviews, 'charge')),
    ])
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    reviews as unknown as Record<string, unknown>[],
    'reviews',
    reviewSchema,
    syncTimestamp
  ) as unknown as Stripe.Review[];
}

