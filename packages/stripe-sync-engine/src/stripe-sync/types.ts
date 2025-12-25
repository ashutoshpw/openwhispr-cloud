import Stripe from 'stripe'
import { PostgresClient } from '../database/postgres'
import { StripeSyncConfig } from '../types'

export interface StripeSyncContext {
  stripe: Stripe
  postgresClient: PostgresClient
  config: StripeSyncConfig
}

