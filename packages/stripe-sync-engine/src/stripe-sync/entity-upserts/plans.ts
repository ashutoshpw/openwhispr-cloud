import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { planSchema } from '../../schemas/plan'
import { getUniqueIds } from '../utils'
import { backfillProducts } from './products'

export async function upsertPlans(
  context: StripeSyncContext,
  plans: Stripe.Plan[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Plan[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await backfillProducts(context, getUniqueIds(plans, 'product'))
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    plans as unknown as Record<string, unknown>[],
    'plans',
    planSchema,
    syncTimestamp
  ) as unknown as Stripe.Plan[];
}

export async function deletePlan(context: StripeSyncContext, id: string): Promise<boolean> {
  return context.postgresClient.delete('plans', id)
}

