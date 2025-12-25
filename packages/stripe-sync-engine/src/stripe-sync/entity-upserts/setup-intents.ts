import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { setupIntentsSchema } from '../../schemas/setup_intents'
import { getUniqueIds } from '../utils'
import { backfillCustomers } from './customers'

export async function upsertSetupIntents(
  context: StripeSyncContext,
  setupIntents: Stripe.SetupIntent[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.SetupIntent[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await backfillCustomers(context, getUniqueIds(setupIntents, 'customer'))
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    setupIntents as unknown as Record<string, unknown>[],
    'setup_intents',
    setupIntentsSchema,
    syncTimestamp
  ) as unknown as Stripe.SetupIntent[];
}

