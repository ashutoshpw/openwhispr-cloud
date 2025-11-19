import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { db } from "@/lib/db";
import { user, organization, payments, session } from "@/lib/db/schema";
import { getSiteAdminStatus } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sql, eq } from "drizzle-orm";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Authentication required");
  }

  const isAdmin = await getSiteAdminStatus(session.user.id);
  if (!isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }

  return session;
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "get_admin_stats",
      "Get comprehensive statistics about users, organizations, payments, and active sessions",
      {},
      async () => {
        try {
          await requireAdmin();

          const [totalUsers] = await db()
            .select({ count: sql<number>`count(*)` })
            .from(user);

          const [totalOrganizations] = await db()
            .select({ count: sql<number>`count(*)` })
            .from(organization);

          const [totalPayments] = await db()
            .select({ count: sql<number>`count(*)` })
            .from(payments);

          const activeSessions = await db()
            .select()
            .from(session)
            .where(sql`${session.expiresAt} > NOW()`);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    totalUsers: Number(totalUsers.count),
                    totalOrganizations: Number(totalOrganizations.count),
                    totalPayments: Number(totalPayments.count),
                    activeSessions: activeSessions.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "get_user_by_email",
      "Get user information by email address",
      {
        email: z.string().email(),
      },
      async ({ email }) => {
        try {
          await requireAdmin();

          const [foundUser] = await db()
            .select()
            .from(user)
            .where(eq(user.email, email))
            .limit(1);

          if (!foundUser) {
            return {
              content: [
                {
                  type: "text",
                  text: `User with email ${email} not found`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(foundUser, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "get_user_by_id",
      "Get user information by user ID",
      {
        userId: z.string(),
      },
      async ({ userId }) => {
        try {
          await requireAdmin();

          const [foundUser] = await db()
            .select()
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

          if (!foundUser) {
            return {
              content: [
                {
                  type: "text",
                  text: `User with ID ${userId} not found`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(foundUser, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "list_users",
      "List all users with optional limit",
      {
        limit: z.number().int().min(1).max(100).optional(),
      },
      async ({ limit = 50 }) => {
        try {
          await requireAdmin();

          const users = await db()
            .select()
            .from(user)
            .orderBy(user.createdAt)
            .limit(limit);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(users, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "list_organizations",
      "List all organizations with optional limit",
      {
        limit: z.number().int().min(1).max(100).optional(),
      },
      async ({ limit = 50 }) => {
        try {
          await requireAdmin();

          const organizations = await db()
            .select()
            .from(organization)
            .orderBy(organization.createdAt)
            .limit(limit);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(organizations, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "get_payment_records",
      "Get payment records with optional limit",
      {
        limit: z.number().int().min(1).max(100).optional(),
      },
      async ({ limit = 50 }) => {
        try {
          await requireAdmin();

          const paymentRecords = await db()
            .select()
            .from(payments)
            .orderBy(payments.created_time)
            .limit(limit);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(paymentRecords, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "get_payments_by_email",
      "Get payment records for a specific email address",
      {
        email: z.string().email(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      async ({ email, limit = 50 }) => {
        try {
          await requireAdmin();

          const paymentRecords = await db()
            .select()
            .from(payments)
            .where(eq(payments.email, email))
            .orderBy(payments.created_time)
            .limit(limit);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(paymentRecords, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "get_active_sessions",
      "Get all active user sessions",
      {
        limit: z.number().int().min(1).max(100).optional(),
      },
      async ({ limit = 50 }) => {
        try {
          await requireAdmin();

          const activeSessions = await db()
            .select()
            .from(session)
            .where(sql`${session.expiresAt} > NOW()`)
            .orderBy(session.createdAt)
            .limit(limit);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(activeSessions, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );

    server.tool(
      "get_organization_by_id",
      "Get organization information by organization ID",
      {
        organizationId: z.string(),
      },
      async ({ organizationId }) => {
        try {
          await requireAdmin();

          const [foundOrg] = await db()
            .select()
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1);

          if (!foundOrg) {
            return {
              content: [
                {
                  type: "text",
                  text: `Organization with ID ${organizationId} not found`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(foundOrg, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              },
            ],
          };
        }
      },
    );
  },
  {},
  { basePath: "/api" },
);

export { handler as GET, handler as POST };

