import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { disputeSchema } from '../../schemas/dispute'
import { getUniqueIds } from '../utils'
import { backfillCharges } from './charges'

export async function upsertDisputes(
  context: StripeSyncContext,
  disputes: Stripe.Dispute[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Dispute[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await backfillCharges(context, getUniqueIds(disputes, 'charge'))
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    disputes as unknown as Record<string, unknown>[],
    'disputes',
    disputeSchema,
    syncTimestamp
  ) as unknown as Stripe.Dispute[];
}

