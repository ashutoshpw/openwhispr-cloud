"use server";

import { BetterAuthServer } from "@repo/auth/better-auth/server";
import { db } from "@repo/database";
import { organization, member, project } from "@repo/database/schema";
import { eq, inArray } from "@repo/database";
import type {
  ListOrganizationsResult,
  CreateOrganizationParams,
  CreateOrganizationResult,
  SetActiveOrganizationParams,
  SetActiveOrganizationResult,
} from "@repo/auth/types";
import { headers } from "next/headers";

let serverInstance: BetterAuthServer | null = null;

function getServerInstance(): BetterAuthServer {
  if (!serverInstance) {
    serverInstance = new BetterAuthServer();
  }
  return serverInstance;
}

export async function listBetterAuthOrganizations(): Promise<ListOrganizationsResult> {
  try {
    const { headers } = await import("next/headers");
    const server = getServerInstance();
    const session = await server.getSession(await headers());

    if (!session?.user?.id) {
      return {
        error: {
          message: "Unauthorized",
        },
      };
    }

    const userMembers = await db()
      .select()
      .from(member)
      .where(eq(member.userId, session.user.id));

    const organizationIds = userMembers.map((m) => m.organizationId);

    if (organizationIds.length === 0) {
      return { data: [] };
    }

    const organizations = await db()
      .select()
      .from(organization)
      .where(inArray(organization.id, organizationIds));

    return {
      data: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
        isActive: false,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      })),
    };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to list organizations",
      },
    };
  }
}

export async function createBetterAuthOrganization(
  params: CreateOrganizationParams,
): Promise<CreateOrganizationResult> {
  try {
    const server = getServerInstance();
    const authInstance = server.getAuthInstance();
    const headersObject = await headers();

    const result: any = await authInstance.api.createOrganization({
      headers: headersObject,
      body: {
        name: params.name,
        slug: params.slug,
      },
    });

    if (result?.error) {
      return {
        error: {
          message: result.error.message || "Failed to create organization",
          code: result.error.code,
        },
      };
    }

    const org = result.data || result;

    // Create default project for the new organization
    const { nanoid } = await import("nanoid");
    await db().insert(project).values({
      id: nanoid(),
      name: "Default Project",
      slug: "default",
      organizationId: org.id,
      isDefault: true,
    });

    return {
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
        isActive: org.isActive ?? false,
        createdAt: org.createdAt ? new Date(org.createdAt) : undefined,
        updatedAt: org.updatedAt ? new Date(org.updatedAt) : undefined,
      },
    };
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create organization",
      },
    };
  }
}

export async function setActiveBetterAuthOrganization(
  params: SetActiveOrganizationParams,
): Promise<SetActiveOrganizationResult> {
  try {
    const server = getServerInstance();
    const authInstance = server.getAuthInstance();
    const headersObject = await headers();
    const result: any = await authInstance.api.setActiveOrganization({
      headers: headersObject,
      body: {
        organizationId: params.organizationId,
      },
    });

    if (result?.error) {
      return {
        error: {
          message: result.error.message || "Failed to set active organization",
          code: result.error.code,
        },
      };
    }

    return {};
  } catch (error) {
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to set active organization",
      },
    };
  }
}
