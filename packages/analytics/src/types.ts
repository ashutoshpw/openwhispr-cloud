// Shared display types used by both DB-backed and PostHog analytics queries

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface SeriesResult {
  series: SeriesPoint[];
  total: number;
  prevTotal: number;
  rangeDays: number;
  bucket: "day" | "week";
}

export interface SnapshotItem {
  label: string;
  value: number;
}

export interface TopOrgItem {
  organizationId: string;
  name: string;
  slug: string;
  revenue: number;
}
