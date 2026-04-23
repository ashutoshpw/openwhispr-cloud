export type RangeKey = "7d" | "30d" | "90d" | "1y" | "all";

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

export const DEFAULT_RANGE: RangeKey = "30d";

export function parseRange(value: string | null | undefined): RangeKey {
  if (!value) return DEFAULT_RANGE;
  if (
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "1y" ||
    value === "all"
  ) {
    return value;
  }
  return DEFAULT_RANGE;
}

/** Fixed cap so "all" can't blow up bucket counts. */
const MAX_DAYS = 730;

export function rangeDays(range: RangeKey): number {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "1y":
      return 365;
    case "all":
      return MAX_DAYS;
  }
}

/** Use weekly buckets for ranges over 90 days to keep result sets small. */
export function bucketUnit(range: RangeKey): "day" | "week" {
  return range === "1y" || range === "all" ? "week" : "day";
}
