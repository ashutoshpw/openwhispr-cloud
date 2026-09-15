import { auth } from "@repo/auth/server";
import type { SessionUser } from "./types";

/**
 * Session guard for the sync plane.
 *
 * The desktop sends `Authorization: Bearer <session token>`; browsers (www,
 * notes, admin) present the cross-subdomain session cookie. Both resolve
 * through Better Auth's getSession.
 */
export async function requireSession(
  request: Request,
): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user as { role?: string }).role ?? null,
  };
}

export function unauthorized(): Response {
  // The desktop maps any 401 to AUTH_EXPIRED and re-authenticates.
  return Response.json({ error: { message: "Unauthorized" } }, { status: 401 });
}

export async function withSession(
  request: Request,
  handler: (user: SessionUser) => Promise<Response>,
): Promise<Response> {
  const user = await requireSession(request);
  if (!user) return unauthorized();
  return handler(user);
}
