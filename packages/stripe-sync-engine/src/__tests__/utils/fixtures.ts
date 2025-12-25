// @ts-nocheck
import Stripe from 'stripe'

function timestamp(): number {
  return Math.floor(Date.now() / 1000)
}

export function createStripeEvent<T>(
  type: Stripe.Event.Type,
  object: T,
  overrides: Partial<Stripe.Event> = {}
): Stripe.Event {
  return {
    id: overrides.id ?? `evt_${type.replace(/\./g, '_')}`,
    object: 'event',
    api_version: overrides.api_version ?? '2020-08-27',
    created: overrides.created ?? timestamp(),
    data: {
      object,
      previous_attributes: undefined,
    },
    livemode: overrides.livemode ?? false,
    pending_webhooks: overrides.pending_webhooks ?? 1,
    request: overrides.request ?? { id: 'req_test', idempotency_key: null },
    type,
    account: overrides.account ?? null,
    user_id: overrides.user_id ?? null,
  } as Stripe.Event
}

export function createCharge(overrides: Partial<Stripe.Charge> = {}): Stripe.Charge {
  return {
    id: overrides.id ?? 'ch_test',
    object: 'charge',
    amount: overrides.amount ?? 2000,
    amount_captured: overrides.amount_captured ?? 2000,
    amount_refunded: overrides.amount_refunded ?? 0,
    application: overrides.application ?? null,
    application_fee: overrides.application_fee ?? null,
    application_fee_amount: overrides.application_fee_amount ?? null,
    balance_transaction: overrides.balance_transaction ?? 'txn_test',
    billing_details: overrides.billing_details ?? {
      address: {
        city: null,
        country: 'US',
        line1: '1 Test Street',
        line2: null,
        postal_code: '94107',
        state: 'CA',
      },
      email: 'user@example.com',
      name: 'Test User',
      phone: null,
    },
    calculated_statement_descriptor: overrides.calculated_statement_descriptor ?? null,
    captured: overrides.captured ?? true,
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    customer: overrides.customer ?? 'cus_test',
    description: overrides.description ?? 'Test charge',
    destination: overrides.destination ?? null,
    dispute: overrides.dispute ?? null,
    disputed: overrides.disputed ?? false,
    failure_balance_transaction: overrides.failure_balance_transaction ?? null,
    failure_code: overrides.failure_code ?? null,
    failure_message: overrides.failure_message ?? null,
    fraud_details: overrides.fraud_details ?? {},
    invoice: overrides.invoice ?? 'in_test',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    on_behalf_of: overrides.on_behalf_of ?? null,
    order: overrides.order ?? null,
    outcome: overrides.outcome ?? null,
    paid: overrides.paid ?? true,
    payment_intent: overrides.payment_intent ?? 'pi_test',
    payment_method: overrides.payment_method ?? 'pm_test',
    payment_method_details: overrides.payment_method_details ?? {},
    receipt_email: overrides.receipt_email ?? null,
    receipt_number: overrides.receipt_number ?? null,
    receipt_url: overrides.receipt_url ?? 'https://example.com',
    refunded: overrides.refunded ?? false,
    refunds:
      overrides.refunds ??
      ({
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/v1/refunds',
      } as Stripe.ApiList<Stripe.Refund>),
    review: overrides.review ?? null,
    shipping: overrides.shipping ?? null,
    source: overrides.source ?? null,
    source_transfer: overrides.source_transfer ?? null,
    statement_descriptor: overrides.statement_descriptor ?? null,
    statement_descriptor_suffix: overrides.statement_descriptor_suffix ?? null,
    status: overrides.status ?? 'succeeded',
    transfer: overrides.transfer ?? null,
    transfer_data: overrides.transfer_data ?? null,
    transfer_group: overrides.transfer_group ?? null,
  } as Stripe.Charge
}

export function createCustomer(overrides: Partial<Stripe.Customer> = {}): Stripe.Customer {
  return {
    id: overrides.id ?? 'cus_test',
    object: 'customer',
    address: overrides.address ?? null,
    balance: overrides.balance ?? 0,
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    default_source: overrides.default_source ?? null,
    delinquent: overrides.delinquent ?? false,
    description: overrides.description ?? 'Test customer',
    discount: overrides.discount ?? null,
    email: overrides.email ?? 'user@example.com',
    invoice_credit_balance: overrides.invoice_credit_balance ?? {},
    invoice_prefix: overrides.invoice_prefix ?? 'ABCD',
    invoice_settings: overrides.invoice_settings ?? {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    name: overrides.name ?? 'Test User',
    next_invoice_sequence: overrides.next_invoice_sequence ?? 1,
    phone: overrides.phone ?? null,
    preferred_locales: overrides.preferred_locales ?? [],
    shipping: overrides.shipping ?? null,
    tax_exempt: overrides.tax_exempt ?? 'none',
    test_clock: overrides.test_clock ?? null,
  } as Stripe.Customer
}

export function createDeletedCustomer(
  overrides: Partial<Stripe.DeletedCustomer> = {}
): Stripe.DeletedCustomer {
  return {
    id: overrides.id ?? 'cus_deleted',
    object: 'customer',
    deleted: true,
  }
}

export function createSubscriptionItem(
  overrides: Partial<Stripe.SubscriptionItem> = {}
): Stripe.SubscriptionItem {
  return {
    id: overrides.id ?? 'si_test',
    object: 'subscription_item',
    billing_thresholds: overrides.billing_thresholds ?? null,
    created: overrides.created ?? timestamp(),
    metadata: overrides.metadata ?? {},
    plan:
      overrides.plan ??
      ({
        id: 'plan_test',
        object: 'plan',
        active: true,
        aggregate_usage: null,
        amount: 2000,
        amount_decimal: '2000',
        billing_scheme: 'per_unit',
        created: timestamp(),
        currency: 'usd',
        interval: 'month',
        interval_count: 1,
        livemode: false,
        metadata: {},
        nickname: 'Test plan',
        product: 'prod_test',
        tiers_mode: null,
        transform_usage: null,
        trial_period_days: null,
        usage_type: 'licensed',
      } as unknown as Stripe.Plan),
    price:
      overrides.price ??
      ({
        id: 'price_test',
        object: 'price',
        active: true,
        billing_scheme: 'per_unit',
        created: timestamp(),
        currency: 'usd',
        livemode: false,
        metadata: {},
        product: 'prod_test',
        recurring: {
          aggregate_usage: null,
          interval: 'month',
          interval_count: 1,
          trial_period_days: null,
          usage_type: 'licensed',
        },
        tax_behavior: 'unspecified',
        type: 'recurring',
        unit_amount: 2000,
        unit_amount_decimal: '2000',
      } as Stripe.Price),
    quantity: overrides.quantity ?? 1,
    subscription: overrides.subscription ?? 'sub_test',
    metadata_subscription_item: overrides.metadata_subscription_item ?? undefined,
    billing_thresholds_subscription_item: overrides.billing_thresholds_subscription_item ?? undefined,
  } as Stripe.SubscriptionItem
}

export function createSubscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  const items = overrides.items ?? {
    object: 'list',
    data: [createSubscriptionItem({ subscription: overrides.id ?? 'sub_test' })],
    has_more: false,
    total_count: 1,
    url: '/v1/subscription_items',
  }

  return {
    id: overrides.id ?? 'sub_test',
    object: 'subscription',
    customer: overrides.customer ?? 'cus_test',
    status: overrides.status ?? 'active',
    items,
    latest_invoice: overrides.latest_invoice ?? 'in_test',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    billing_cycle_anchor: overrides.billing_cycle_anchor ?? timestamp(),
    cancel_at: overrides.cancel_at ?? null,
    cancel_at_period_end: overrides.cancel_at_period_end ?? false,
    canceled_at: overrides.canceled_at ?? null,
    collection_method: overrides.collection_method ?? 'charge_automatically',
    created: overrides.created ?? timestamp(),
    current_period_end: overrides.current_period_end ?? timestamp() + 3600,
    current_period_start: overrides.current_period_start ?? timestamp(),
    default_payment_method: overrides.default_payment_method ?? null,
    default_source: overrides.default_source ?? null,
    latest_invoice_subscription: overrides.latest_invoice_subscription ?? undefined,
    pending_setup_intent: overrides.pending_setup_intent ?? null,
    schedule: overrides.schedule ?? null,
    test_clock: overrides.test_clock ?? null,
    trial_end: overrides.trial_end ?? null,
    trial_start: overrides.trial_start ?? null,
  } as Stripe.Subscription
}

export function createInvoice(overrides: Partial<Stripe.Invoice> = {}): Stripe.Invoice {
  const lines = overrides.lines ?? {
    object: 'list',
    has_more: false,
    total_count: 1,
    url: '/v1/invoices/inv_test/lines',
    data: [
      {
        id: 'il_test',
        object: 'line_item',
        amount: 2000,
        currency: 'usd',
        description: 'Test line item',
        livemode: false,
        metadata: {},
        price: {
          id: 'price_test',
          object: 'price',
          currency: 'usd',
          product: 'prod_test',
          unit_amount: 2000,
        },
        quantity: 1,
        type: 'subscription',
      },
    ],
  }

  return {
    id: overrides.id ?? 'in_test',
    object: 'invoice',
    customer: overrides.customer ?? 'cus_test',
    status: overrides.status ?? 'draft',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    amount_due: overrides.amount_due ?? 2000,
    amount_paid: overrides.amount_paid ?? 0,
    amount_remaining: overrides.amount_remaining ?? 2000,
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    description: overrides.description ?? null,
    hosted_invoice_url: overrides.hosted_invoice_url ?? 'https://example.com/invoice',
    invoice_pdf: overrides.invoice_pdf ?? 'https://example.com/invoice.pdf',
    lines,
    number: overrides.number ?? '0001',
    payment_intent: overrides.payment_intent ?? 'pi_test',
    subscription: overrides.subscription ?? 'sub_test',
  } as Stripe.Invoice
}

export function createPaymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {}
): Stripe.PaymentIntent {
  return {
    id: overrides.id ?? 'pi_test',
    object: 'payment_intent',
    amount: overrides.amount ?? 2000,
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    customer: overrides.customer ?? 'cus_test',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    status: overrides.status ?? 'succeeded',
    payment_method: overrides.payment_method ?? 'pm_test',
    payment_method_types: overrides.payment_method_types ?? ['card'],
    charges: overrides.charges ?? {
      object: 'list',
      data: [],
      has_more: false,
      total_count: 0,
      url: '/v1/charges',
    },
    last_payment_error: overrides.last_payment_error ?? null,
    next_action: overrides.next_action ?? null,
    receipt_email: overrides.receipt_email ?? null,
  } as Stripe.PaymentIntent
}

export function createSetupIntent(
  overrides: Partial<Stripe.SetupIntent> = {}
): Stripe.SetupIntent {
  return {
    id: overrides.id ?? 'seti_test',
    object: 'setup_intent',
    client_secret: overrides.client_secret ?? 'seti_secret',
    created: overrides.created ?? timestamp(),
    customer: overrides.customer ?? 'cus_test',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    payment_method: overrides.payment_method ?? 'pm_test',
    status: overrides.status ?? 'succeeded',
    usage: overrides.usage ?? 'off_session',
  } as Stripe.SetupIntent
}

export function createDispute(overrides: Partial<Stripe.Dispute> = {}): Stripe.Dispute {
  return {
    id: overrides.id ?? 'dp_test',
    object: 'dispute',
    amount: overrides.amount ?? 2000,
    charge: overrides.charge ?? 'ch_test',
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    evidence: overrides.evidence ?? {},
    evidence_details: overrides.evidence_details ?? {
      due_by: timestamp() + 86400,
      has_evidence: false,
      past_due: false,
      submission_count: 0,
    },
    is_charge_refundable: overrides.is_charge_refundable ?? false,
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    reason: overrides.reason ?? 'fraudulent',
    status: overrides.status ?? 'needs_response',
  } as Stripe.Dispute
}

export function createRefund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    id: overrides.id ?? 're_test',
    object: 'refund',
    amount: overrides.amount ?? 500,
    charge: overrides.charge ?? 'ch_test',
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    payment_intent: overrides.payment_intent ?? 'pi_test',
    reason: overrides.reason ?? null,
    status: overrides.status ?? 'succeeded',
    balance_transaction: overrides.balance_transaction ?? 'txn_refund',
    metadata: overrides.metadata ?? {},
  } as Stripe.Refund
}

export function createCheckoutSession(
  overrides: Partial<Stripe.Checkout.Session> = {}
): Stripe.Checkout.Session {
  return {
    id: overrides.id ?? 'cs_test',
    object: 'checkout.session',
    customer: overrides.customer ?? 'cus_test',
    customer_details: overrides.customer_details ?? null,
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    payment_intent: overrides.payment_intent ?? 'pi_test',
    subscription: overrides.subscription ?? 'sub_test',
    status: overrides.status ?? 'complete',
    payment_status: overrides.payment_status ?? 'paid',
    invoice: overrides.invoice ?? 'in_test',
    mode: overrides.mode ?? 'subscription',
    created: overrides.created ?? timestamp(),
    url: overrides.url ?? 'https://example.com/session',
    amount_subtotal: overrides.amount_subtotal ?? 2000,
    amount_total: overrides.amount_total ?? 2000,
    currency: overrides.currency ?? 'usd',
  } as Stripe.Checkout.Session
}

export function createLineItem(overrides: Partial<Stripe.LineItem> = {}): Stripe.LineItem {
  return {
    id: overrides.id ?? 'li_test',
    object: 'item',
    amount_discount: overrides.amount_discount ?? 0,
    amount_subtotal: overrides.amount_subtotal ?? 2000,
    amount_tax: overrides.amount_tax ?? 0,
    amount_total: overrides.amount_total ?? 2000,
    currency: overrides.currency ?? 'usd',
    description: overrides.description ?? 'Test line item',
    price:
      overrides.price ??
      ({
        id: 'price_test',
        object: 'price',
        currency: 'usd',
        unit_amount: 2000,
        product: 'prod_test',
      } as Stripe.Price),
    quantity: overrides.quantity ?? 1,
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    tax_rates: overrides.tax_rates ?? [],
  } as Stripe.LineItem
}

export function createCreditNote(
  overrides: Partial<Stripe.CreditNote> = {}
): Stripe.CreditNote {
  const lines = overrides.lines ?? {
    object: 'list',
    has_more: false,
    total_count: 1,
    url: '/v1/credit_notes/lines',
    data: [
      {
        id: 'cnli_test',
        object: 'credit_note_line_item',
        amount: 500,
        description: 'Credit line',
        livemode: false,
        quantity: 1,
        type: 'invoice_line_item',
      },
    ],
  }

  return {
    id: overrides.id ?? 'cn_test',
    object: 'credit_note',
    amount: overrides.amount ?? 500,
    customer: overrides.customer ?? 'cus_test',
    invoice: overrides.invoice ?? 'in_test',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    number: overrides.number ?? '0001',
    status: overrides.status ?? 'issued',
    memo: overrides.memo ?? null,
    lines,
  } as Stripe.CreditNote
}

export function createTaxId(overrides: Partial<Stripe.TaxId> = {}): Stripe.TaxId {
  return {
    id: overrides.id ?? 'txi_test',
    object: 'tax_id',
    country: overrides.country ?? 'US',
    created: overrides.created ?? timestamp(),
    customer: overrides.customer ?? 'cus_test',
    livemode: overrides.livemode ?? false,
    type: overrides.type ?? 'eu_vat',
    value: overrides.value ?? 'EU123456789',
    verification: overrides.verification ?? {
      status: 'verified',
      verified_address: null,
      verified_name: null,
    },
  } as Stripe.TaxId
}

export function createPaymentMethod(
  overrides: Partial<Stripe.PaymentMethod> = {}
): Stripe.PaymentMethod {
  return {
    id: overrides.id ?? 'pm_test',
    object: 'payment_method',
    customer: overrides.customer ?? 'cus_test',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    type: overrides.type ?? 'card',
    card: overrides.card ?? {
      brand: 'visa',
      checks: {
        address_line1_check: null,
        address_postal_code_check: null,
        cvc_check: 'pass',
      },
      country: 'US',
      exp_month: 12,
      exp_year: 2030,
      fingerprint: 'fp_test',
      funding: 'credit',
      last4: '4242',
      networks: { preferred: null, available: ['visa'] },
      three_d_secure_usage: { supported: true },
      wallet: null,
    },
  } as Stripe.PaymentMethod
}

export function createSubscriptionSchedule(
  overrides: Partial<Stripe.SubscriptionSchedule> = {}
): Stripe.SubscriptionSchedule {
  return {
    id: overrides.id ?? 'subsch_test',
    object: 'subscription_schedule',
    customer: overrides.customer ?? 'cus_test',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    status: overrides.status ?? 'active',
    phases: overrides.phases ?? [],
    released_subscription: overrides.released_subscription ?? null,
    subscription: overrides.subscription ?? 'sub_test',
  } as Stripe.SubscriptionSchedule
}

export function createProduct(overrides: Partial<Stripe.Product> = {}): Stripe.Product {
  return {
    id: overrides.id ?? 'prod_test',
    object: 'product',
    active: overrides.active ?? true,
    created: overrides.created ?? timestamp(),
    description: overrides.description ?? 'Test product',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    name: overrides.name ?? 'Test Product',
    default_price: overrides.default_price ?? 'price_test',
    shippable: overrides.shippable ?? false,
    statement_descriptor: overrides.statement_descriptor ?? null,
    tax_code: overrides.tax_code ?? null,
    unit_label: overrides.unit_label ?? null,
    updated: overrides.updated ?? timestamp(),
  } as Stripe.Product
}

export function createPrice(overrides: Partial<Stripe.Price> = {}): Stripe.Price {
  return {
    id: overrides.id ?? 'price_test',
    object: 'price',
    active: overrides.active ?? true,
    billing_scheme: overrides.billing_scheme ?? 'per_unit',
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    product: overrides.product ?? 'prod_test',
    recurring: overrides.recurring ?? {
      aggregate_usage: null,
      interval: 'month',
      interval_count: 1,
      trial_period_days: null,
      usage_type: 'licensed',
    },
    tax_behavior: overrides.tax_behavior ?? 'unspecified',
    type: overrides.type ?? 'recurring',
    unit_amount: overrides.unit_amount ?? 2000,
    unit_amount_decimal: overrides.unit_amount_decimal ?? '2000',
  } as Stripe.Price
}

export function createPlan(overrides: Partial<Stripe.Plan> = {}): Stripe.Plan {
  return {
    id: overrides.id ?? 'plan_test',
    object: 'plan',
    active: overrides.active ?? true,
    aggregate_usage: overrides.aggregate_usage ?? null,
    amount: overrides.amount ?? 2000,
    amount_decimal: overrides.amount_decimal ?? '2000',
    billing_scheme: overrides.billing_scheme ?? 'per_unit',
    created: overrides.created ?? timestamp(),
    currency: overrides.currency ?? 'usd',
    interval: overrides.interval ?? 'month',
    interval_count: overrides.interval_count ?? 1,
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    nickname: overrides.nickname ?? 'Test plan',
    product: overrides.product ?? 'prod_test',
    tiers_mode: overrides.tiers_mode ?? null,
    transform_usage: overrides.transform_usage ?? null,
    trial_period_days: overrides.trial_period_days ?? null,
    usage_type: overrides.usage_type ?? 'licensed',
  } as Stripe.Plan
}

export function createEarlyFraudWarning(
  overrides: Partial<Stripe.Radar.EarlyFraudWarning> = {}
): Stripe.Radar.EarlyFraudWarning {
  return {
    id: overrides.id ?? 'issfr_test',
    object: 'radar.early_fraud_warning',
    actionable: overrides.actionable ?? true,
    charge: overrides.charge ?? 'ch_test',
    created: overrides.created ?? timestamp(),
    fraud_type: overrides.fraud_type ?? 'card_never_received',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    payment_intent: overrides.payment_intent ?? 'pi_test',
  } as Stripe.Radar.EarlyFraudWarning
}

export function createReview(overrides: Partial<Stripe.Review> = {}): Stripe.Review {
  return {
    id: overrides.id ?? 'prv_test',
    object: 'review',
    billing_zip: overrides.billing_zip ?? '94107',
    charge: overrides.charge ?? 'ch_test',
    closed_reason: overrides.closed_reason ?? null,
    created: overrides.created ?? timestamp(),
    ip_address: overrides.ip_address ?? '127.0.0.1',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    open: overrides.open ?? true,
    reason: overrides.reason ?? 'rule',
    session: overrides.session ?? null,
  } as Stripe.Review
}

export function createFeature(
  overrides: Partial<Stripe.Entitlements.Feature> = {}
): Stripe.Entitlements.Feature {
  return {
    id: overrides.id ?? 'feat_test',
    object: 'entitlements.feature',
    name: overrides.name ?? 'Test feature',
    lookup_key: overrides.lookup_key ?? 'test_feature',
    livemode: overrides.livemode ?? false,
    metadata: overrides.metadata ?? {},
    active: overrides.active ?? true,
  } as Stripe.Entitlements.Feature
}

export function createActiveEntitlement(
  overrides: Partial<Stripe.Entitlements.ActiveEntitlement> = {}
): Stripe.Entitlements.ActiveEntitlement {
  return {
    id: overrides.id ?? 'ae_test',
    object: 'entitlements.active_entitlement',
    customer: overrides.customer ?? 'cus_test',
    feature: overrides.feature ?? 'feat_test',
    livemode: overrides.livemode ?? false,
    lookup_key: overrides.lookup_key ?? 'test_feature',
  } as Stripe.Entitlements.ActiveEntitlement
}

export function createActiveEntitlementSummary(
  overrides: Partial<Stripe.Entitlements.ActiveEntitlementSummary> = {}
): Stripe.Entitlements.ActiveEntitlementSummary {
  return {
    object: 'entitlements.active_entitlement_summary',
    id: overrides.id ?? 'aes_test',
    customer: overrides.customer ?? 'cus_test',
    entitlements:
      overrides.entitlements ?? {
        object: 'list',
        data: [createActiveEntitlement()],
        has_more: false,
        total_count: 1,
        url: '/v1/entitlements/active_entitlements',
      },
  } as Stripe.Entitlements.ActiveEntitlementSummary
}
