/**
 * Pure-function parsing helpers shared across engine adapters.
 */

import type { AieoCitation } from "./types";

export function normalizeDomain(input: string): string {
  if (!input) return "";
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "");
  d = d.split("/")[0] ?? d;
  d = d.replace(/^www\./, "");
  return d;
}

export function urlToCitation(
  url: string,
  title?: string,
): AieoCitation | null {
  try {
    const u = new URL(url);
    return {
      url: u.toString(),
      domain: normalizeDomain(u.hostname),
      ...(title ? { title } : {}),
    };
  } catch {
    return null;
  }
}

export function findOurCitation(
  citations: AieoCitation[],
  targetDomain: string,
): string | null {
  const t = normalizeDomain(targetDomain);
  const m = citations.find((c) => c.domain === t || c.domain.endsWith(`.${t}`));
  return m?.url ?? null;
}

export function findBrandMention(
  answer: string,
  targetDomain: string,
): { mentioned: boolean; rank: number | null } {
  const t = normalizeDomain(targetDomain);
  const baseName = t.split(".")[0] ?? t;
  const lowered = answer.toLowerCase();

  const idxBrand = lowered.indexOf(baseName);
  const idxDomain = lowered.indexOf(t);
  const positions = [idxBrand, idxDomain].filter((i) => i >= 0);
  if (positions.length === 0) return { mentioned: false, rank: null };
  const min = Math.min(...positions);
  return { mentioned: true, rank: min + 1 };
}

export function competitorsFromAnswer(
  answer: string,
  citations: AieoCitation[],
  competitors: string[],
): string[] {
  const lowered = answer.toLowerCase();
  const found = new Set<string>();
  const competitorDomains = competitors.map(normalizeDomain).filter(Boolean);
  const citedDomains = new Set(citations.map((c) => c.domain));
  for (const c of competitorDomains) {
    const baseName = c.split(".")[0] ?? c;
    if (
      lowered.includes(c) ||
      lowered.includes(baseName) ||
      citedDomains.has(c)
    ) {
      found.add(c);
    }
  }
  return Array.from(found);
}

export function heuristicSentiment(
  answer: string,
  targetDomain: string,
): "positive" | "neutral" | "negative" {
  const t = normalizeDomain(targetDomain);
  const baseName = t.split(".")[0] ?? t;
  const lowered = answer.toLowerCase();
  const idx = lowered.indexOf(baseName);
  if (idx === -1) return "neutral";

  const window = lowered.slice(
    Math.max(0, idx - 200),
    Math.min(lowered.length, idx + 200),
  );
  const positives = [
    "best",
    "great",
    "powerful",
    "popular",
    "leading",
    "top",
    "recommended",
    "excellent",
    "love",
  ];
  const negatives = [
    "bad",
    "poor",
    "expensive",
    "limited",
    "lacks",
    "worst",
    "broken",
    "buggy",
    "outdated",
  ];
  let p = 0;
  let n = 0;
  for (const w of positives) if (window.includes(w)) p++;
  for (const w of negatives) if (window.includes(w)) n++;
  if (p === 0 && n === 0) return "neutral";
  return p >= n ? "positive" : "negative";
}
