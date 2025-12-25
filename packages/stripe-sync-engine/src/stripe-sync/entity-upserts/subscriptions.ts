import Stripe from 'stripe'
import { pg as sql } from 'yesql'
import { StripeSyncContext } from '../types'
import { subscriptionSchema } from '../../schemas/subscription'
import { subscriptionItemSchema } from '../../schemas/subscription_item'
import { getUniqueIds, fetchMissingEntities, expandEntity } from '../utils'
import { backfillCustomers } from './customers'

export async function upsertSubscriptions(
  context: StripeSyncContext,
  subscriptions: Stripe.Subscription[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Subscription[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    const customerIds = getUniqueIds(subscriptions, 'customer')

    await backfillCustomers(context, customerIds)
  }

  await expandEntity(context, subscriptions, 'items', (id) =>
    context.stripe.subscriptionItems.list({ subscription: id, limit: 100 })
  )

  const rows = await context.postgresClient.upsertManyWithTimestampProtection(
    subscriptions as unknown as Record<string, unknown>[],
    'subscriptions',
    subscriptionSchema,
    syncTimestamp
  ) as unknown as Stripe.Subscription[];

  const allSubscriptionItems = subscriptions.flatMap((subscription) => subscription.items.data)
  await upsertSubscriptionItems(context, allSubscriptionItems, syncTimestamp)

  const markSubscriptionItemsDeleted: Promise<{ rowCount: number }>[] = []
  for (const subscription of subscriptions) {
    const subscriptionItems = subscription.items.data
    const subItemIds = subscriptionItems.map((x: Stripe.SubscriptionItem) => x.id)
    markSubscriptionItemsDeleted.push(
      markDeletedSubscriptionItems(context, subscription.id, subItemIds)
    )
  }
  await Promise.all(markSubscriptionItemsDeleted)

  return rows
}

export async function upsertSubscriptionItems(
  context: StripeSyncContext,
  subscriptionItems: Stripe.SubscriptionItem[],
  syncTimestamp?: string
) {
  const modifiedSubscriptionItems = subscriptionItems.map((subscriptionItem) => {
    const priceId = subscriptionItem.price.id.toString()
    const deleted = subscriptionItem.deleted
    const quantity = subscriptionItem.quantity
    return {
      ...subscriptionItem,
      price: priceId,
      deleted: deleted ?? false,
      quantity: quantity ?? null,
    }
  })

  await context.postgresClient.upsertManyWithTimestampProtection(
    modifiedSubscriptionItems,
    'subscription_items',
    subscriptionItemSchema,
    syncTimestamp
  )
}

export async function markDeletedSubscriptionItems(
  context: StripeSyncContext,
  subscriptionId: string,
  currentSubItemIds: string[]
): Promise<{ rowCount: number }> {
  let prepared = sql(`
    select id from "${context.config.schema}"."subscription_items"
    where subscription = :subscriptionId and deleted = false;
    `)({ subscriptionId })
  const { rows } = await context.postgresClient.query(prepared.text, prepared.values)
  const deletedIds = rows.filter(
    ({ id }: { id: string }) => currentSubItemIds.includes(id) === false
  )

  if (deletedIds.length > 0) {
    const ids = deletedIds.map(({ id }: { id: string }) => id)
    prepared = sql(`
      update "${context.config.schema}"."subscription_items"
      set deleted = true where id=any(:ids::text[]);
      `)({ ids })
    const { rowCount } = await await context.postgresClient.query(prepared.text, prepared.values)
    return { rowCount: rowCount || 0 }
  } else {
    return { rowCount: 0 }
  }
}

export async function backfillSubscriptions(
  context: StripeSyncContext,
  subscriptionIds: string[]
) {
  const missingSubscriptionIds = await context.postgresClient.findMissingEntries(
    'subscriptions',
    subscriptionIds
  )

  await fetchMissingEntities(missingSubscriptionIds, (id) =>
    context.stripe.subscriptions.retrieve(id)
  ).then((subscriptions) => upsertSubscriptions(context, subscriptions))
}

