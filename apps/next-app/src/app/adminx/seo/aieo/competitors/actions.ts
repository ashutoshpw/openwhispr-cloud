"use server";

import {
  setCompetitorExcluded,
  setCompetitorPinned,
} from "@/lib/dal/seo/competitors";
import { inngest } from "@/lib/inngest/client";
import { ensureSeoAccess } from "@/lib/seo-guard";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function pinCompetitorAction(
  id: string,
  pin: boolean,
): Promise<ActionResult> {
  await ensureSeoAccess("read_write");
  await setCompetitorPinned(id, pin);
  revalidatePath("/adminx/seo/aieo/competitors");
  return { ok: true };
}

export async function excludeCompetitorAction(
  id: string,
  exclude: boolean,
): Promise<ActionResult> {
  await ensureSeoAccess("read_write");
  await setCompetitorExcluded(id, exclude);
  revalidatePath("/adminx/seo/aieo/competitors");
  return { ok: true };
}

export async function reinferCompetitorsAction(): Promise<ActionResult> {
  await ensureSeoAccess("read_write");
  await inngest.send({
    name: "cron/seo-competitor-rollup",
    data: { triggeredBy: "manual" },
  });
  return {
    ok: true,
    message: "Re-inference queued — refresh in a few seconds",
  };
}
