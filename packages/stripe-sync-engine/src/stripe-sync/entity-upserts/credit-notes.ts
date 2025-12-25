import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { creditNoteSchema } from '../../schemas/credit_note'
import { getUniqueIds, expandEntity } from '../utils'
import { backfillCustomers } from './customers'
import { backfillInvoices } from './invoices'

export async function upsertCreditNotes(
  context: StripeSyncContext,
  creditNotes: Stripe.CreditNote[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.CreditNote[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await Promise.all([
      backfillCustomers(context, getUniqueIds(creditNotes, 'customer')),
      backfillInvoices(context, getUniqueIds(creditNotes, 'invoice')),
    ])
  }

  await expandEntity(context, creditNotes, 'lines', (id) =>
    context.stripe.creditNotes.listLineItems(id, { limit: 100 })
  )

  return context.postgresClient.upsertManyWithTimestampProtection(
    creditNotes as unknown as Record<string, unknown>[],
    'credit_notes',
    creditNoteSchema,
    syncTimestamp
  ) as unknown as Stripe.CreditNote[];
}

