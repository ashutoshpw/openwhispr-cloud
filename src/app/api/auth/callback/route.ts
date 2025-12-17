import { handleAuth } from "@workos-inc/authkit-nextjs";
import { getAuthConfig } from "@/lib/auth/config";
import { NextRequest } from "next/server";

function getBaseURL(request: NextRequest): string {
  const config = getAuthConfig("authkit");
  
  if (config.baseURL) {
    return config.baseURL;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: NextRequest) {
  const baseURL = getBaseURL(request);
  
  const handler = handleAuth({
    returnPathname: "/dashboard",
    baseURL,
    onSuccess: async ({ user }) => {
      if (user) {
        try {
          const {
            syncAuthKitUserToDb,
            syncAuthKitAccountToDb,
          } = await import("@/lib/auth/providers/authkit/db-sync");

          const authKitUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName || null,
            lastName: user.lastName || null,
            profilePictureUrl: user.profilePictureUrl || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          };

          await syncAuthKitUserToDb(authKitUser);
          await syncAuthKitAccountToDb(authKitUser);
        } catch (error) {
          console.error("[AuthKit Callback] Error syncing user to DB:", error);
        }
      }
    },
  });
  
  return handler(request);
}

