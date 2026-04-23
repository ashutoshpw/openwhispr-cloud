/**
 * UI-editable global config for AIEO. Stored as jsonb so we can hold scalars
 * or arrays. Typed getters with defaults so callers don't see undefined.
 */

import { db, eq, seoSettings } from "@repo/database";

export type AieoSettingKey =
  | "weeklyBudgetUsd"
  | "sentimentModel"
  | "targetDomain"
  | "noiseDomains"
  | "posthogProjectId"
  | "posthogHost";

const DEFAULTS: Record<AieoSettingKey, unknown> = {
  weeklyBudgetUsd: 5,
  sentimentModel: "gpt-5.4-mini",
  targetDomain: "example.com",
  noiseDomains: [
    "wikipedia.org",
    "github.com",
    "reddit.com",
    "youtube.com",
    "medium.com",
    "quora.com",
    "stackoverflow.com",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "facebook.com",
  ],
  posthogProjectId: "",
  posthogHost: "https://us.i.posthog.com",
};

export async function getSetting<T = unknown>(key: AieoSettingKey): Promise<T> {
  const rows = await db()
    .select()
    .from(seoSettings)
    .where(eq(seoSettings.key, key))
    .limit(1);
  const row = rows[0];
  if (!row) return DEFAULTS[key] as T;
  return row.value as T;
}

export async function setSetting(
  key: AieoSettingKey,
  value: unknown,
  setBy: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db()
    .insert(seoSettings)
    .values({ key, value: value as object, updatedAt: now, updatedBy: setBy })
    .onConflictDoUpdate({
      target: seoSettings.key,
      set: { value: value as object, updatedAt: now, updatedBy: setBy },
    });
}

export async function listSettings(): Promise<
  Array<{
    key: string;
    value: unknown;
    updatedAt: number;
    updatedBy: string | null;
  }>
> {
  const rows = await db().select().from(seoSettings);
  const stored = new Map(rows.map((r) => [r.key, r]));
  return (Object.keys(DEFAULTS) as AieoSettingKey[]).map((k) => {
    const r = stored.get(k);
    return {
      key: k,
      value: r ? r.value : DEFAULTS[k],
      updatedAt: r?.updatedAt ?? 0,
      updatedBy: r?.updatedBy ?? null,
    };
  });
}
