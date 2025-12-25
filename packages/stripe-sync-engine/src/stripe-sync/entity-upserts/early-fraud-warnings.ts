import Stripe from 'stripe'
import { StripeSyncContext } from '../types'
import { earlyFraudWarningSchema } from '../../schemas/early_fraud_warning'
import { getUniqueIds } from '../utils'
import { backfillPaymentIntents } from './payment-intents'
import { backfillCharges } from './charges'

export async function upsertEarlyFraudWarning(
  context: StripeSyncContext,
  earlyFraudWarnings: Stripe.Radar.EarlyFraudWarning[],
  backfillRelatedEntities?: boolean,
  syncTimestamp?: string
): Promise<Stripe.Radar.EarlyFraudWarning[]> {
  if (backfillRelatedEntities ?? context.config.backfillRelatedEntities) {
    await Promise.all([
      backfillPaymentIntents(context, getUniqueIds(earlyFraudWarnings, 'payment_intent')),
      backfillCharges(context, getUniqueIds(earlyFraudWarnings, 'charge')),
    ])
  }

  return context.postgresClient.upsertManyWithTimestampProtection(
    earlyFraudWarnings as unknown as Record<string, unknown>[],
    'early_fraud_warnings',
    earlyFraudWarningSchema,
    syncTimestamp
  ) as unknown as Stripe.Radar.EarlyFraudWarning[];
}

