import { getSiteAdminStatus } from "@/lib/auth-utils";
import { stripe } from "@/lib/stripe/client";
import { auth } from "@repo/auth/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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
      active: false,
    });

    revalidatePath("/adminx/stripe/products");
    revalidatePath(`/adminx/stripe/products/${id}`);

    return NextResponse.json({ status: "archived", product });
  } catch (error: any) {
    console.error("Error archiving product:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
