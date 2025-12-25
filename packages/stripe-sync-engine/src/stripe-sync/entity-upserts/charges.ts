import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { chargeSchema } from '../../schemas/charge'
import { getUniqueIds, fetchMissingEntities, expandEntity } from '../utils'
import { backfillCustomers } from './customers'
import { backfillInvoices } from './invoices'

export async function upsertCharges(
  context: StripeSyncContext,
  charges: Stripe.Charge[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Charge[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await Promise.all([
      backfillCustomers(context, getUniqueIds(charges, 'customer')),
      backfillInvoices(context, getUniqueIds(charges, 'invoice')),
    ])
  }

  await expandEntity(context, charges, 'refunds', (id) =>
    context.stripe.refunds.list({ charge: id, limit: 100 })
  )

  return context.postgresClient.upsertManyWithTimestampProtection(
    charges as unknown as Record<string, unknown>[],
    'charges',
    chargeSchema,
    syncTimestamp
  ) as unknown as Stripe.Charge[]
}

export async function backfillCharges(context: StripeSyncContext, chargeIds: string[]) {
  const missingChargeIds = await context.postgresClient.findMissingEntries('charges', chargeIds)

  await fetchMissingEntities(missingChargeIds, (id) =>
    context.stripe.charges.retrieve(id)
  ).then((charges) => upsertCharges(context, charges))
}
