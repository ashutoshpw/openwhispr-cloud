/**
 * @repo/durable-exec
 * Main entry: exports the Inngest client and event types for consumers
 * (e.g. server actions that call inngest.send()).
 */

export { inngest } from "./client";
export type { DurableEvents } from "./events";
export { allFunctions } from "./functions";

// Re-export aieo public surface for app server actions
export {
  getSecret,
  setSecret,
  listMaskedSecrets,
  recordValidation,
  deleteSecret,
} from "./seo/aieo/secrets/store";
export type { AieoSecretKey, MaskedSecret } from "./seo/aieo/secrets/store";
export {
  getSetting,
  setSetting,
  listSettings,
} from "./seo/aieo/settings/store";
export type { AieoSettingKey } from "./seo/aieo/settings/store";
