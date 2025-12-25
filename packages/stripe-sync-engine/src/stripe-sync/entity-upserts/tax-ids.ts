import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { taxIdSchema } from '../../schemas/tax_id'
import { getUniqueIds } from '../utils'
import { backfillCustomers } from './customers'

export async function upsertTaxIds(
  context: StripeSyncContext,
  taxIds: Stripe.TaxId[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.TaxId[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await backfillCustomers(context, getUniqueIds(taxIds, 'customer'))
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    taxIds as unknown as Record<string, unknown>[],
    'tax_ids',
    taxIdSchema,
    syncTimestamp
  ) as unknown as Stripe.TaxId[];
}

export async function deleteTaxId(context: StripeSyncContext, id: string): Promise<boolean> {
  return context.postgresClient.delete('tax_ids', id)
}

