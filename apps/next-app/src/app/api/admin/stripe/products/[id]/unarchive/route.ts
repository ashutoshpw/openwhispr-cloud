import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@repo/auth/server";
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/client";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await getSiteAdminStatus(session.user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const product = await stripe.products.update(id, {
      active: true,
    });

    revalidatePath("/adminx/stripe/products");
    revalidatePath(`/adminx/stripe/products/${id}`);

    return NextResponse.json({ status: "unarchived", product });
  } catch (error: any) {
    console.error("Error unarchiving product:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
