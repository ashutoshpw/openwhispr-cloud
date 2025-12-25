import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { checkoutSessionSchema } from '../../schemas/checkout_sessions'
import { checkoutSessionLineItemSchema } from '../../schemas/checkout_session_line_items'
import { getUniqueIds } from '../utils'
import { backfillCustomers } from './customers'
import { backfillSubscriptions } from './subscriptions'
import { backfillPaymentIntents } from './payment-intents'
import { backfillInvoices } from './invoices'
import { backfillPrices } from './prices'

export async function upsertCheckoutSessions(
  context: StripeSyncContext,
  checkoutSessions: Stripe.Checkout.Session[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Checkout.Session[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await Promise.all([
      backfillCustomers(context, getUniqueIds(checkoutSessions, 'customer')),
      backfillSubscriptions(context, getUniqueIds(checkoutSessions, 'subscription')),
      backfillPaymentIntents(context, getUniqueIds(checkoutSessions, 'payment_intent')),
      backfillInvoices(context, getUniqueIds(checkoutSessions, 'invoice')),
    ])
  }

  const rows = await context.postgresClient.upsertManyWithTimestampProtection(
    checkoutSessions as unknown as Record<string, unknown>[],
    'checkout_sessions',
    checkoutSessionSchema,
    syncTimestamp
  ) as unknown as Stripe.Checkout.Session[];

  await fillCheckoutSessionsLineItems(
    context,
    checkoutSessions.map((cs) => cs.id),
    syncTimestamp
  )

  return rows as unknown as Stripe.Checkout.Session[];
}

export async function fillCheckoutSessionsLineItems(
  context: StripeSyncContext,
  checkoutSessionIds: string[],
  syncTimestamp?: string
) {
  for (const checkoutSessionId of checkoutSessionIds) {
    const lineItemResponses: Stripe.LineItem[] = []

    for await (const lineItem of context.stripe.checkout.sessions.listLineItems(checkoutSessionId, {
      limit: 100,
    })) {
      lineItemResponses.push(lineItem)
    }

    await upsertCheckoutSessionLineItems(context, lineItemResponses, checkoutSessionId, syncTimestamp)
  }
}

export async function upsertCheckoutSessionLineItems(
  context: StripeSyncContext,
  lineItems: Stripe.LineItem[],
  checkoutSessionId: string,
  syncTimestamp?: string
) {
  await backfillPrices(
    context,
    lineItems
      .map((lineItem) => lineItem.price?.id?.toString() ?? undefined)
      .filter((id) => id !== undefined)
  )

  const modifiedLineItems = lineItems.map((lineItem) => {
    const priceId =
      typeof lineItem.price === 'object' && lineItem.price?.id
        ? lineItem.price.id.toString()
        : lineItem.price?.toString() || null

    return {
      ...lineItem,
      price: priceId,
      checkout_session: checkoutSessionId,
    }
  })

  await context.postgresClient.upsertManyWithTimestampProtection(
    modifiedLineItems,
    'checkout_session_line_items',
    checkoutSessionLineItemSchema,
    syncTimestamp
  )
}

