import { getProviderName } from "@repo/auth/config";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const providerName = getProviderName();
    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    if (providerName === "better-auth") {
      const { setActiveBetterAuthOrganization } = await import(
        "@/lib/auth/providers/better-auth/organization-actions"
      );
      const result = await setActiveBetterAuthOrganization({ organizationId });

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true });
    } else if (providerName === "next-auth") {
      const { setActiveNextAuthOrganization } = await import(
        "@/lib/auth/providers/next-auth/organization-actions"
      );
      const result = await setActiveNextAuthOrganization({ organizationId });

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 },
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      {
        error: `Organization feature not supported by ${providerName}`,
      },
      { status: 501 },
    );
  } catch (error) {
    console.error("Error setting active organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
