import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { subscriptionScheduleSchema } from '../../schemas/subscription_schedules'
import { getUniqueIds, fetchMissingEntities } from '../utils'
import { backfillCustomers } from './customers'

export async function upsertSubscriptionSchedules(
  context: StripeSyncContext,
  subscriptionSchedules: Stripe.SubscriptionSchedule[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.SubscriptionSchedule[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    const customerIds = getUniqueIds(subscriptionSchedules, 'customer')

    await backfillCustomers(context, customerIds)
  }

  const rows = await context.postgresClient.upsertManyWithTimestampProtection(
    subscriptionSchedules as unknown as Record<string, unknown>[],
    'subscription_schedules',
    subscriptionScheduleSchema,
    syncTimestamp
  ) as unknown as Stripe.SubscriptionSchedule[];

  return rows
}

export async function backfillSubscriptionSchedules(
  context: StripeSyncContext,
  subscriptionIds: string[]
) {
  const missingSubscriptionIds = await context.postgresClient.findMissingEntries(
    'subscription_schedules',
    subscriptionIds
  )

  await fetchMissingEntities(missingSubscriptionIds, (id) =>
    context.stripe.subscriptionSchedules.retrieve(id)
  ).then((subscriptionSchedules) => upsertSubscriptionSchedules(context, subscriptionSchedules))
}

