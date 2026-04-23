/**
 * Nightly validation of stored AIEO secrets.
 * Cron: daily 00:00 UTC (`0 0 * * *`)
 */

import {
  type AieoSecretKey,
  getSecret,
  listMaskedSecrets,
  recordValidation,
} from "@/lib/aieo/secrets/store";
import { inngest } from "../../client";

async function validate(
  key: AieoSecretKey,
  value: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (key) {
      case "PERPLEXITY_API_KEY": {
        const r = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${value}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
        });
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      case "OPENAI_API_KEY": {
        const r = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${value}` },
        });
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      case "GEMINI_API_KEY": {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(value)}`,
        );
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      case "ANTHROPIC_API_KEY": {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": value,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        });
        if (r.ok || r.status === 400) return { ok: true };
        return { ok: false, error: `HTTP ${r.status}` };
      }
      case "DATAFORSEO_AUTH": {
        const r = await fetch(
          "https://api.dataforseo.com/v3/appendix/user_data",
          { headers: { Authorization: value } },
        );
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      case "POSTHOG_API_KEY": {
        const r = await fetch("https://us.i.posthog.com/api/users/@me/", {
          headers: { Authorization: `Bearer ${value}` },
        });
        return r.ok ? { ok: true } : { ok: false, error: `HTTP ${r.status}` };
      }
      default:
        return { ok: false, error: `Unknown key ${key}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const seoSecretValidationFunction = inngest.createFunction(
  {
    id: "seo-secret-validation",
    retries: 0,
    triggers: [{ cron: "0 0 * * *" }, { event: "cron/seo-secret-validation" }],
  },
  async ({ step }) => {
    const secrets = await step.run("list-secrets", () => listMaskedSecrets());
    let ok = 0;
    let failed = 0;

    for (const s of secrets) {
      const outcome = await step.run(`validate-${s.key}`, async () => {
        const value = await getSecret(s.key);
        if (!value) return { ok: false, error: "no value" };
        const r = await validate(s.key, value);
        await recordValidation(s.key, r.ok ? "ok" : "failed", r.error);
        return r;
      });
      if (outcome.ok) ok++;
      else failed++;
    }

    console.log(`[seo-secret-validation] done ok=${ok} failed=${failed}`);
    return { ok, failed };
  },
);
