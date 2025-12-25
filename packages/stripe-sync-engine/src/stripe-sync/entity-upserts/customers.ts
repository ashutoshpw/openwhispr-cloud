import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { customerSchema, customerDeletedSchema } from '../../schemas/customer'
import { fetchMissingEntities } from '../utils'

export async function upsertCustomers(
  context: StripeSyncContext,
  customers: (Stripe.Customer | Stripe.DeletedCustomer)[],
  syncTimestamp?: string
): Promise<(Stripe.Customer | Stripe.DeletedCustomer)[]> {
  const deletedCustomers = customers.filter((customer) => customer.deleted)
  const nonDeletedCustomers = customers.filter((customer) => !customer.deleted)

  await context.postgresClient.upsertManyWithTimestampProtection(
    nonDeletedCustomers as unknown as Record<string, unknown>[],
    'customers',
    customerSchema,
    syncTimestamp
  )
  await context.postgresClient.upsertManyWithTimestampProtection(
    deletedCustomers as unknown as Record<string, unknown>[],
    'customers',
    customerDeletedSchema,
    syncTimestamp
  )

  return customers
}

export async function backfillCustomers(context: StripeSyncContext, customerIds: string[]) {
  const missingIds = await context.postgresClient.findMissingEntries('customers', customerIds)

  await fetchMissingEntities(missingIds, (id) => context.stripe.customers.retrieve(id))
    .then((entries) => upsertCustomers(context, entries))
    .catch((err) => {
      context.config.logger?.error(err, 'Failed to backfill')
      throw err
    })
}

