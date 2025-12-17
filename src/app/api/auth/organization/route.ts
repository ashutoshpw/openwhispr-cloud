import { getProviderName } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const providerName = getProviderName();

    if (providerName === "better-auth") {
      const { listBetterAuthOrganizations } = await import(
        "@/lib/auth/providers/better-auth/organization-actions"
      );
      const result = await listBetterAuthOrganizations();

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data || []);
    } else if (providerName === "next-auth") {
      const { listNextAuthOrganizations } = await import(
        "@/lib/auth/providers/next-auth/organization-actions"
      );
      const result = await listNextAuthOrganizations();

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data || []);
    } else if (providerName === "clerk-dev") {
      const { listClerkOrganizations } = await import(
        "@/lib/auth/providers/clerk-dev/organization-actions"
      );
      const result = await listClerkOrganizations();

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data || []);
    }

    return NextResponse.json(
      {
        error: `Organization feature not supported by ${providerName}`,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error listing organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const providerName = getProviderName();
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    if (providerName === "better-auth") {
      const { createBetterAuthOrganization } = await import(
        "@/lib/auth/providers/better-auth/organization-actions"
      );
      const result = await createBetterAuthOrganization({ name, slug });

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data);
    } else if (providerName === "next-auth") {
      const { createNextAuthOrganization } = await import(
        "@/lib/auth/providers/next-auth/organization-actions"
      );
      const result = await createNextAuthOrganization({ name, slug });

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data);
    } else if (providerName === "clerk-dev") {
      const { createClerkOrganization } = await import(
        "@/lib/auth/providers/clerk-dev/organization-actions"
      );
      const result = await createClerkOrganization({ name, slug });

      if (result.error) {
        return NextResponse.json(
          { error: result.error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(result.data);
    }

    return NextResponse.json(
      {
        error: `Organization feature not supported by ${providerName}`,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

