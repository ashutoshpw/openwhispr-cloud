import { getBetterAuthServer } from "@repo/auth/server";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Cookie name must match middleware
const HAS_WORKSPACE_COOKIE = "has_workspace";

/**
 * Create a JSON response that sets the workspace cookie.
 */
function createSuccessResponse(data: unknown): NextResponse {
  const response = NextResponse.json(data);
  response.cookies.set(HAS_WORKSPACE_COOKIE, "1", {
    path: "/",
    maxAge: 5 * 60,
    sameSite: "lax",
  });
  return response;
}

export async function GET() {
  try {
    const server = getBetterAuthServer();
    const session = await server.getSession(await headers());

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instance = server.getAuthInstance();
    const orgs = await instance.api.listOrganizations({
      headers: await headers(),
    });

    return NextResponse.json(orgs || []);
  } catch (error) {
    console.error("Error listing organizations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const server = getBetterAuthServer();
    const session = await server.getSession(await headers());

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 },
      );
    }

    const instance = server.getAuthInstance();
    const result = await instance.api.createOrganization({
      body: { name, slug },
      headers: await headers(),
    });

    return createSuccessResponse(result);
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
