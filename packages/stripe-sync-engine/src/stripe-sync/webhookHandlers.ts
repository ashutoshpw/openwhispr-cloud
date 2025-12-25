import Stripe from 'stripe'
import { StripeSyncContext } from './types'
import type { RevalidateEntity } from '../types'
import {
  upsertCharges,
  upsertCheckoutSessions,
  upsertCreditNotes,
  upsertCustomers,
  upsertDisputes,
  upsertEarlyFraudWarning,
  upsertInvoices,
  upsertPaymentIntents,
  upsertPaymentMethods,
  upsertPlans,
  upsertPrices,
  upsertProducts,
  upsertRefunds,
  upsertReviews,
  upsertSetupIntents,
  upsertSubscriptions,
  upsertSubscriptionSchedules,
  upsertTaxIds,
  upsertActiveEntitlements,
  deleteRemovedActiveEntitlements,
  deleteTaxId,
  deleteProduct,
  deletePrice,
  deletePlan,
} from './entity-upserts'

export async function processWebhook(
  context: StripeSyncContext,
  payload: Buffer | string,
  signature: string | undefined
) {
  if (!signature) {
    throw new Error('Stripe webhook signature is required')
  }

  const event = await context.stripe.webhooks.constructEventAsync(
    payload,
    signature,
    context.config.stripeWebhookSecret
  )

  return processEvent(context, event)
}

function getSyncTimestamp(event: Stripe.Event, refetched: boolean) {
  return refetched ? new Date().toISOString() : new Date(event.created * 1000).toISOString()
}

function shouldRefetchEntity(context: StripeSyncContext, entity: { object: string }) {
  return context.config.revalidateObjectsViaStripeApi?.includes(entity.object as RevalidateEntity)
}

async function fetchOrUseWebhookData<T extends { id?: string; object: string }>(
  context: StripeSyncContext,
  entity: T,
  fetchFn: (id: string) => Promise<T>,
  entityInFinalState?: (entity: T) => boolean
): Promise<{ entity: T; refetched: boolean }> {
  if (!entity.id) return { entity, refetched: false }

  if (entityInFinalState?.(entity)) return { entity, refetched: false }

  if (shouldRefetchEntity(context, entity)) {
    const fetchedEntity = await fetchFn(entity.id)
    return { entity: fetchedEntity, refetched: true }
  }

  return { entity, refetched: false }
}

export async function processEvent(context: StripeSyncContext, event: Stripe.Event) {
  switch (event.type) {
    case 'charge.captured':
    case 'charge.expired':
    case 'charge.failed':
    case 'charge.pending':
    case 'charge.refunded':
    case 'charge.succeeded':
    case 'charge.updated': {
      const { entity: charge, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Charge,
        (id) => context.stripe.charges.retrieve(id),
        (charge) => charge.status === 'failed' || charge.status === 'succeeded'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for charge ${charge.id}`
      )

      await upsertCharges(context, [charge], false, getSyncTimestamp(event, refetched))
      break
    }
    case 'customer.deleted': {
      const customer: Stripe.DeletedCustomer = {
        id: event.data.object.id,
        object: 'customer',
        deleted: true,
      }

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for customer ${customer.id}`
      )

      await upsertCustomers(context, [customer], getSyncTimestamp(event, false))
      break
    }
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.completed':
    case 'checkout.session.expired': {
      const { entity: checkoutSession, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Checkout.Session,
        (id) => context.stripe.checkout.sessions.retrieve(id)
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for checkout session ${checkoutSession.id}`
      )

      await upsertCheckoutSessions(
        context,
        [checkoutSession],
        false,
        getSyncTimestamp(event, refetched)
      )
      break
    }
    case 'customer.created':
    case 'customer.updated': {
      const { entity: customer, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Customer | Stripe.DeletedCustomer,
        (id) => context.stripe.customers.retrieve(id),
        (customer) => customer.deleted === true
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for customer ${customer.id}`
      )

      await upsertCustomers(context, [customer], getSyncTimestamp(event, refetched))
      break
    }
    case 'customer.subscription.created':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.pending_update_applied':
    case 'customer.subscription.pending_update_expired':
    case 'customer.subscription.trial_will_end':
    case 'customer.subscription.resumed':
    case 'customer.subscription.updated': {
      const { entity: subscription, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Subscription,
        (id) => context.stripe.subscriptions.retrieve(id),
        (subscription) =>
          subscription.status === 'canceled' || subscription.status === 'incomplete_expired'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for subscription ${subscription.id}`
      )

      await upsertSubscriptions(
        context,
        [subscription],
        false,
        getSyncTimestamp(event, refetched)
      )
      break
    }
    case 'customer.tax_id.updated':
    case 'customer.tax_id.created': {
      const { entity: taxId, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.TaxId,
        (id) => context.stripe.taxIds.retrieve(id)
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for taxId ${taxId.id}`
      )

      await upsertTaxIds(context, [taxId], false, getSyncTimestamp(event, refetched))
      break
    }
    case 'customer.tax_id.deleted': {
      const taxId = event.data.object as Stripe.TaxId

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for taxId ${taxId.id}`
      )

      await deleteTaxId(context, taxId.id)
      break
    }
    case 'invoice.created':
    case 'invoice.deleted':
    case 'invoice.finalized':
    case 'invoice.finalization_failed':
    case 'invoice.paid':
    case 'invoice.payment_action_required':
    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded':
    case 'invoice.upcoming':
    case 'invoice.sent':
    case 'invoice.voided':
    case 'invoice.marked_uncollectible':
    case 'invoice.updated': {
      const { entity: invoice, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Invoice,
        (id) => context.stripe.invoices.retrieve(id),
        (invoice) => invoice.status === 'void'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for invoice ${invoice.id}`
      )

      await upsertInvoices(context, [invoice], false, getSyncTimestamp(event, refetched))
      break
    }
    case 'product.created':
    case 'product.updated': {
      try {
        const { entity: product, refetched } = await fetchOrUseWebhookData(
          context,
          event.data.object as Stripe.Product,
          (id) => context.stripe.products.retrieve(id)
        )

        context.config.logger?.info(
          `Received webhook ${event.id}: ${event.type} for product ${product.id}`
        )

        await upsertProducts(context, [product], getSyncTimestamp(event, refetched))
      } catch (err) {
        if (err instanceof Stripe.errors.StripeAPIError && err.code === 'resource_missing') {
          await deleteProduct(context, event.data.object.id)
        } else {
          throw err
        }
      }

      break
    }
    case 'product.deleted': {
      const product = event.data.object as Stripe.Product

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for product ${product.id}`
      )

      await deleteProduct(context, product.id)
      break
    }
    case 'price.created':
    case 'price.updated': {
      try {
        const { entity: price, refetched } = await fetchOrUseWebhookData(
          context,
          event.data.object as Stripe.Price,
          (id) => context.stripe.prices.retrieve(id)
        )

        context.config.logger?.info(
          `Received webhook ${event.id}: ${event.type} for price ${price.id}`
        )

        await upsertPrices(context, [price], false, getSyncTimestamp(event, refetched))
      } catch (err) {
        if (err instanceof Stripe.errors.StripeAPIError && err.code === 'resource_missing') {
          await deletePrice(context, event.data.object.id)
        } else {
          throw err
        }
      }

      break
    }
    case 'price.deleted': {
      const price = event.data.object as Stripe.Price

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for price ${price.id}`
      )

      await deletePrice(context, price.id)
      break
    }
    case 'plan.created':
    case 'plan.updated': {
      try {
        const { entity: plan, refetched } = await fetchOrUseWebhookData(
          context,
          event.data.object as Stripe.Plan,
          (id) => context.stripe.plans.retrieve(id)
        )

        context.config.logger?.info(
          `Received webhook ${event.id}: ${event.type} for plan ${plan.id}`
        )

        await upsertPlans(context, [plan], false, getSyncTimestamp(event, refetched))
      } catch (err) {
        if (err instanceof Stripe.errors.StripeAPIError && err.code === 'resource_missing') {
          await deletePlan(context, event.data.object.id)
        } else {
          throw err
        }
      }

      break
    }
    case 'plan.deleted': {
      const plan = event.data.object as Stripe.Plan

      context.config.logger?.info(`Received webhook ${event.id}: ${event.type} for plan ${plan.id}`)

      await deletePlan(context, plan.id)
      break
    }
    case 'setup_intent.canceled':
    case 'setup_intent.created':
    case 'setup_intent.requires_action':
    case 'setup_intent.setup_failed':
    case 'setup_intent.succeeded': {
      const { entity: setupIntent, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.SetupIntent,
        (id) => context.stripe.setupIntents.retrieve(id),
        (setupIntent) => setupIntent.status === 'canceled' || setupIntent.status === 'succeeded'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for setupIntent ${setupIntent.id}`
      )

      await upsertSetupIntents(context, [setupIntent], false, getSyncTimestamp(event, refetched))
      break
    }
    case 'subscription_schedule.aborted':
    case 'subscription_schedule.canceled':
    case 'subscription_schedule.completed':
    case 'subscription_schedule.created':
    case 'subscription_schedule.expiring':
    case 'subscription_schedule.released':
    case 'subscription_schedule.updated': {
      const { entity: subscriptionSchedule, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.SubscriptionSchedule,
        (id) => context.stripe.subscriptionSchedules.retrieve(id),
        (schedule) => schedule.status === 'canceled' || schedule.status === 'completed'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for subscriptionSchedule ${subscriptionSchedule.id}`
      )

      await upsertSubscriptionSchedules(
        context,
        [subscriptionSchedule],
        false,
        getSyncTimestamp(event, refetched)
      )
      break
    }
    case 'payment_method.attached':
    case 'payment_method.automatically_updated':
    case 'payment_method.detached':
    case 'payment_method.updated': {
      const { entity: paymentMethod, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.PaymentMethod,
        (id) => context.stripe.paymentMethods.retrieve(id)
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for paymentMethod ${paymentMethod.id}`
      )

      await upsertPaymentMethods(
        context,
        [paymentMethod],
        false,
        getSyncTimestamp(event, refetched)
      )
      break
    }
    case 'charge.dispute.created':
    case 'charge.dispute.funds_reinstated':
    case 'charge.dispute.funds_withdrawn':
    case 'charge.dispute.updated':
    case 'charge.dispute.closed': {
      const { entity: dispute, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Dispute,
        (id) => context.stripe.disputes.retrieve(id),
        (dispute) => dispute.status === 'won' || dispute.status === 'lost'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for dispute ${dispute.id}`
      )

      await upsertDisputes(context, [dispute], false, getSyncTimestamp(event, refetched))
      break
    }
    case 'payment_intent.amount_capturable_updated':
    case 'payment_intent.canceled':
    case 'payment_intent.created':
    case 'payment_intent.partially_funded':
    case 'payment_intent.payment_failed':
    case 'payment_intent.processing':
    case 'payment_intent.requires_action':
    case 'payment_intent.succeeded': {
      const { entity: paymentIntent, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.PaymentIntent,
        (id) => context.stripe.paymentIntents.retrieve(id),
        (entity) => entity.status === 'canceled' || entity.status === 'succeeded'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for paymentIntent ${paymentIntent.id}`
      )

      await upsertPaymentIntents(
        context,
        [paymentIntent],
        false,
        getSyncTimestamp(event, refetched)
      )
      break
    }

    case 'credit_note.created':
    case 'credit_note.updated':
    case 'credit_note.voided': {
      const { entity: creditNote, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.CreditNote,
        (id) => context.stripe.creditNotes.retrieve(id),
        (creditNote) => creditNote.status === 'void'
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for creditNote ${creditNote.id}`
      )

      await upsertCreditNotes(context, [creditNote], false, getSyncTimestamp(event, refetched))
      break
    }

    case 'radar.early_fraud_warning.created':
    case 'radar.early_fraud_warning.updated': {
      const { entity: earlyFraudWarning, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Radar.EarlyFraudWarning,
        (id) => context.stripe.radar.earlyFraudWarnings.retrieve(id)
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for earlyFraudWarning ${earlyFraudWarning.id}`
      )

      await upsertEarlyFraudWarning(
        context,
        [earlyFraudWarning],
        false,
        getSyncTimestamp(event, refetched)
      )

      break
    }

    case 'refund.created':
    case 'refund.failed':
    case 'refund.updated':
    case 'charge.refund.updated': {
      const { entity: refund, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Refund,
        (id) => context.stripe.refunds.retrieve(id)
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for refund ${refund.id}`
      )

      await upsertRefunds(context, [refund], false, getSyncTimestamp(event, refetched))
      break
    }

    case 'review.closed':
    case 'review.opened': {
      const { entity: review, refetched } = await fetchOrUseWebhookData(
        context,
        event.data.object as Stripe.Review,
        (id) => context.stripe.reviews.retrieve(id)
      )

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for review ${review.id}`
      )

      await upsertReviews(context, [review], false, getSyncTimestamp(event, refetched))

      break
    }
    case 'entitlements.active_entitlement_summary.updated': {
      const activeEntitlementSummary = event.data
        .object as Stripe.Entitlements.ActiveEntitlementSummary
      let entitlements = activeEntitlementSummary.entitlements
      let refetched = false
      if (context.config.revalidateObjectsViaStripeApi?.includes('entitlements')) {
        const { lastResponse: _lastResponse, ...rest } =
          await context.stripe.entitlements.activeEntitlements.list({
            customer: activeEntitlementSummary.customer,
          })
        void _lastResponse
        entitlements = rest
        refetched = true
      }

      context.config.logger?.info(
        `Received webhook ${event.id}: ${event.type} for activeEntitlementSummary for customer ${activeEntitlementSummary.customer}`
      )

      await deleteRemovedActiveEntitlements(
        context,
        activeEntitlementSummary.customer,
        entitlements.data.map((entitlement) => entitlement.id)
      )
      await upsertActiveEntitlements(
        context,
        activeEntitlementSummary.customer,
        entitlements.data,
        false,
        getSyncTimestamp(event, refetched)
      )
      break
    }
    default:
      throw new Error('Unhandled webhook event')
  }
}

