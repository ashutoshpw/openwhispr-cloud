import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { priceSchema } from '../../schemas/price'
import { getUniqueIds, fetchMissingEntities } from '../utils'
import { backfillProducts } from './products'

export async function upsertPrices(
  context: StripeSyncContext,
  prices: Stripe.Price[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Price[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await backfillProducts(context, getUniqueIds(prices, 'product'))
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    prices as unknown as Record<string, unknown>[],
    'prices',
    priceSchema,
    syncTimestamp
  ) as unknown as Stripe.Price[];
}

export async function deletePrice(context: StripeSyncContext, id: string): Promise<boolean> {
  return context.postgresClient.delete('prices', id)
}

export async function backfillPrices(context: StripeSyncContext, priceIds: string[]) {
  const missingIds = await context.postgresClient.findMissingEntries('prices', priceIds)
  await fetchMissingEntities(missingIds, (id) => context.stripe.prices.retrieve(id)).then(
    (entries) => upsertPrices(context, entries)
  )
}

