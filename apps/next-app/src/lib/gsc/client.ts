/**
 * Google Search Console daily sync client.
 *
 * Authenticates via a service account loaded from GSC_SERVICE_ACCOUNT_JSON
 * (base64-encoded JSON). The SA must be added as a verified user on the GSC
 * property (Search Console → Settings → Users and permissions).
 *
 * GSC has a ~2 day data lag; the cron pulls the trailing 3 days nightly.
 */

import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

export interface GscSyncRow {
  date: string;
  page: string;
  query: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscSyncOptions {
  /** Days back from today to sync (GSC has ~2d lag, so 3 is the safe minimum) */
  daysBack?: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateRange(daysBack: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (daysBack - 1));
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function getProperty(): string {
  const prop = process.env.GSC_PROPERTY;
  if (!prop) {
    throw new Error(
      "GSC_PROPERTY must be set (e.g. `sc-domain:example.com` or `https://example.com/`)",
    );
  }
  return prop;
}

function loadServiceAccount(): { client_email: string; private_key: string } {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_JSON must be set (base64-encoded service-account JSON)",
    );
  }
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as {
    client_email?: string;
    private_key?: string;
  };
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_JSON missing client_email or private_key",
    );
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

async function getAccessToken(): Promise<string> {
  const sa = loadServiceAccount();
  const jwt = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: SCOPES,
  });
  const { access_token } = await jwt.authorize();
  if (!access_token) throw new Error("Failed to obtain GSC access token");
  return access_token;
}

interface SearchAnalyticsResponse {
  rows?: Array<{
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

async function querySearchAnalytics(
  property: string,
  accessToken: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions: string[];
    rowLimit?: number;
    startRow?: number;
  },
): Promise<SearchAnalyticsResponse> {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rowLimit: 5000, ...body }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GSC API ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as SearchAnalyticsResponse;
}

/**
 * Fetch (date, page) totals and (date, page, query) breakdowns for the
 * trailing `daysBack` days. Returns rows ready for upsertGscRows().
 */
export async function fetchGscRows(
  opts: GscSyncOptions = {},
): Promise<GscSyncRow[]> {
  const property = getProperty();
  const range = dateRange(opts.daysBack ?? 3);
  const accessToken = await getAccessToken();

  const pageTotals = await querySearchAnalytics(property, accessToken, {
    startDate: range.startDate,
    endDate: range.endDate,
    dimensions: ["date", "page"],
  });

  const queryRows = await querySearchAnalytics(property, accessToken, {
    startDate: range.startDate,
    endDate: range.endDate,
    dimensions: ["date", "page", "query"],
  });

  const out: GscSyncRow[] = [];

  for (const r of pageTotals.rows ?? []) {
    const [date, page] = r.keys;
    out.push({
      date,
      page,
      query: null,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    });
  }

  for (const r of queryRows.rows ?? []) {
    const [date, page, query] = r.keys;
    out.push({
      date,
      page,
      query,
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    });
  }

  return out;
}
