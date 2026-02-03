import { baseServer } from "@repo/auth/server";
import { NextResponse } from "next/server";

async function syncClerkToDbAfterOperation(
  request: Request,
  operation: "signup" | "signin" | "signout",
) {
  const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";

  if (authProvider !== "clerk-dev") {
    return;
  }

  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId, sessionId } = await auth();

    if (!userId) {
      return;
    }

    const {
      syncClerkUserToDb,
      syncClerkAccountToDb,
      syncClerkSessionToDb,
      deleteClerkSessionFromDb,
    } = await import("@/lib/auth/providers/clerk-dev/db-sync");

    if (operation === "signout") {
      if (sessionId) {
        await deleteClerkSessionFromDb(sessionId);
      }
      return;
    }

    const user = await currentUser();
    if (!user) {
      return;
    }

    const clerkUser = {
      id: user.id,
      emailAddresses: user.emailAddresses.map((e) => ({
        emailAddress: e.emailAddress,
        id: e.id,
      })),
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    await syncClerkUserToDb(clerkUser);
    await syncClerkAccountToDb(clerkUser);

    if (operation === "signup" || operation === "signin") {
      if (sessionId) {
        const ipAddress =
          request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          null;
        const userAgent = request.headers.get("user-agent") || null;
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await syncClerkSessionToDb(
          sessionId,
          userId,
          expiresAt,
          ipAddress,
          userAgent,
        );
      }
    }
  } catch (error) {
    console.error("[Catch-All Route] Error syncing Clerk to DB:", error);
  }
}

export async function GET(request: Request) {
  const handler = await baseServer.getApiHandler();
  return handler.GET(request);
}

export async function POST(request: Request) {
  const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth";
  const handler = await baseServer.getApiHandler();
  const response = await handler.POST(request);

  if (authProvider === "clerk-dev") {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];

    if (lastPart === "sign-up" || lastPart === "signup") {
      await syncClerkToDbAfterOperation(request, "signup");
    } else if (lastPart === "sign-in" || lastPart === "signin") {
      await syncClerkToDbAfterOperation(request, "signin");
    } else if (lastPart === "sign-out" || lastPart === "signout") {
      await syncClerkToDbAfterOperation(request, "signout");
    }
  }

  return response;
}
