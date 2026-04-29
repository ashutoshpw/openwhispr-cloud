/**
 * Per-run weekly budget guard.
 */

import { getSetting } from "./settings/store";

export interface BudgetState {
  capCents: number;
  spentCents: number;
}

export async function loadBudgetState(): Promise<BudgetState> {
  const usd = (await getSetting<number>("weeklyBudgetUsd")) ?? 5;
  return { capCents: Math.round(usd * 100), spentCents: 0 };
}

export class BudgetExceededError extends Error {
  constructor(
    public spentCents: number,
    public capCents: number,
  ) {
    super(
      `AIEO weekly budget exceeded: spent ${(spentCents / 100).toFixed(2)} of $${(
        capCents / 100
      ).toFixed(2)} cap`,
    );
    this.name = "BudgetExceededError";
  }
}

export function assertWithinBudget(
  state: BudgetState,
  upcomingEstimateCents: number,
): void {
  if (state.spentCents + upcomingEstimateCents > state.capCents) {
    throw new BudgetExceededError(state.spentCents, state.capCents);
  }
}

export function recordSpend(state: BudgetState, costCents: number): void {
  state.spentCents += costCents;
}
