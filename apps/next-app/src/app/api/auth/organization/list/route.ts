import { getBetterAuthServer } from "@repo/auth/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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
