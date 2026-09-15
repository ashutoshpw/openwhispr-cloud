import { withOrg, withOrgAdmin } from "@/lib/org";
import { syncError, syncOk } from "@repo/api-schemas/envelope";
import { db } from "@repo/database";
import { eq } from "@repo/database";
import { organization } from "@repo/database/schema";
import { z } from "zod";

const patchRequest = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().nullish(),
  invoice_email: z.string().nullish(),
  company_name: z.string().nullish(),
  billing_country: z.string().nullish(),
  billing_address: z.string().nullish(),
});

/** PATCH /api/workspaces/{wid} — admin only. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrgAdmin(request, wid, async (_user, orgCtx) => {
    const body = await request.json().catch(() => null);
    const parsed = patchRequest.safeParse(body);
    if (!parsed.success) return syncError(400, "Invalid payload");

    const [org] = await db()
      .update(organization)
      .set({
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.logo !== undefined ? { logo: parsed.data.logo } : {}),
        ...(parsed.data.invoice_email !== undefined
          ? { invoiceEmail: parsed.data.invoice_email }
          : {}),
        ...(parsed.data.company_name !== undefined
          ? { companyName: parsed.data.company_name }
          : {}),
        ...(parsed.data.billing_country !== undefined
          ? { billingCountry: parsed.data.billing_country }
          : {}),
        ...(parsed.data.billing_address !== undefined
          ? { billingAddress: parsed.data.billing_address }
          : {}),
      })
      .where(eq(organization.id, wid))
      .returning();

    void orgCtx;
    return syncOk(org);
  });
}

/** DELETE /api/workspaces/{wid} — owner only; marks the org deleted. */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ wid: string }> },
) {
  const { wid } = await ctx.params;
  return withOrg(request, wid, async (_user, orgCtx) => {
    if (orgCtx.membership.role !== "owner") {
      return syncError(403, "Only the owner can delete a workspace");
    }
    await db()
      .update(organization)
      .set({ status: "deleted" })
      .where(eq(organization.id, wid));
    return syncOk({ id: wid, deleted: true });
  });
}
