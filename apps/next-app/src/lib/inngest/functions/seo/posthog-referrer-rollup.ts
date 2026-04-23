/**
 * Daily PostHog AI-referrer rollup cron. Queries PostHog for sessions where
 * $referring_domain matches known AI hosts; joined with signup events for
 * conversion count. Upserts daily rows into seo_referrer_ai.
 *
 * Cron: daily 03:30 UTC (`30 3 * * *`)
 */

import { getSecret } from "@/lib/aieo/secrets/store";
import { getSetting } from "@/lib/aieo/settings/store";
import { upsertReferrerDay } from "@/lib/dal/seo/referrers";
import { inngest } from "../../client";

const AI_REFERRER_HOSTS = [
  "chatgpt.com",
  "perplexity.ai",
  "gemini.google.com",
  "claude.ai",
  "copilot.microsoft.com",
  "you.com",
  "phind.com",
  "arc.net",
  "bard.google.com",
  "bing.com",
];

async function fetchPosthogReferrers(opts: {
  apiKey: string;
  projectId: string;
  host: string;
  date: string;
}): Promise<Array<{ source: string; sessions: number; signups: number }>> {
  const { apiKey, projectId, host, date } = opts;

  const results: Array<{
    source: string;
    sessions: number;
    signups: number;
  }> = [];

  for (const referrerHost of AI_REFERRER_HOSTS) {
    const sessionsQuery = {
      kind: "EventsQuery",
      event: "$pageview",
      select: ["count()"],
      where: [`properties.$referring_domain = '${referrerHost}'`],
      dateRange: { date_from: date, date_to: date },
    };

    const sessionsRes = await fetch(
      `${host}/api/projects/${projectId}/query/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sessionsQuery }),
      },
    );

    if (!sessionsRes.ok) continue;
    const sessionsData = (await sessionsRes.json()) as {
      results?: Array<[number]>;
    };
    const sessions = sessionsData.results?.[0]?.[0] ?? 0;
    if (sessions === 0) continue;

    const signupsQuery = {
      kind: "EventsQuery",
      event: "user_signed_up",
      select: ["count()"],
      where: [`properties.$initial_referring_domain = '${referrerHost}'`],
      dateRange: { date_from: date, date_to: date },
    };

    const signupsRes = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: signupsQuery }),
    });

    let signups = 0;
    if (signupsRes.ok) {
      const signupsData = (await signupsRes.json()) as {
        results?: Array<[number]>;
      };
      signups = signupsData.results?.[0]?.[0] ?? 0;
    }

    results.push({
      source: referrerHost,
      sessions: Number(sessions),
      signups,
    });
  }

  return results;
}

export const seoPosthogReferrerRollupFunction = inngest.createFunction(
  {
    id: "seo-posthog-referrer-rollup",
    retries: 1,
    triggers: [
      { cron: "30 3 * * *" },
      { event: "cron/seo-posthog-referrer-rollup" },
    ],
  },
  async ({ step }) => {
    const { apiKey, projectId, host } = await step.run(
      "load-config",
      async () => {
        const key = await getSecret("POSTHOG_API_KEY");
        const pid = await getSetting<string>("posthogProjectId");
        const h =
          (await getSetting<string>("posthogHost")) ||
          "https://us.i.posthog.com";
        return { apiKey: key, projectId: pid, host: h };
      },
    );

    if (!apiKey || !projectId) {
      console.log(
        "[seo-posthog-referrer-rollup] POSTHOG_API_KEY or posthogProjectId not set — skipping",
      );
      return { skipped: true };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split("T")[0] as string;

    const rows = await step.run("fetch-posthog", () =>
      fetchPosthogReferrers({
        apiKey,
        projectId: projectId,
        host,
        date,
      }),
    );

    let upserted = 0;
    for (const r of rows) {
      await step.run(`upsert-${r.source}`, () =>
        upsertReferrerDay(date, r.source, r.sessions, r.signups).then(
          () => upserted++,
        ),
      );
    }

    console.log(
      `[seo-posthog-referrer-rollup] date=${date} upserted=${upserted}`,
    );
    return { date, upserted };
  },
);
