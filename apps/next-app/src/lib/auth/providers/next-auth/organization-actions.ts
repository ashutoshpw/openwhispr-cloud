"use server";

import { canUserCreateFreeWorkspace } from "@/lib/billing";
import { auth } from "@repo/auth/server";
import type {
  CreateOrganizationParams,
  CreateOrganizationResult,
  ListOrganizationsResult,
  SetActiveOrganizationParams,
  SetActiveOrganizationResult,
} from "@repo/auth/types";
import { db } from "@repo/database";
import { eq, inArray } from "@repo/database";
import { member, organization, project } from "@repo/database/schema";

export async function listNextAuthOrganizations(): Promise<ListOrganizationsResult> {
  try {
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({
      headers: await headers(),
    });

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

export async function createNextAuthOrganization(
  params: CreateOrganizationParams,
): Promise<CreateOrganizationResult> {
  try {
    const { headers } = await import("next/headers");
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return {
        error: {
          message: "Unauthorized",
        },
      };
    }

    // Check if user can create a free workspace
    // This is for free tier only - paid workspaces go through checkout flow
    const canCreateFree = await canUserCreateFreeWorkspace(session.user.id);
    if (!canCreateFree) {
      return {
        error: {
          message:
            "You already have a free workspace. Please upgrade your existing workspace or create a paid workspace.",
          code: "FREE_WORKSPACE_LIMIT_REACHED",
        },
      };
    }

    const { nanoid } = await import("nanoid");
    const orgId = nanoid();

    const [newOrg] = await db()
      .insert(organization)
      .values({
        id: orgId,
        name: params.name,
        slug: params.slug,
      })
      .returning();

    await db().insert(member).values({
      id: nanoid(),
      organizationId: orgId,
      userId: session.user.id,
      role: "owner",
    });

    // Create default project for the new organization
    await db().insert(project).values({
      id: nanoid(),
      name: "Default Project",
      slug: "default",
      organizationId: orgId,
      isDefault: true,
    });

    return {
      data: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
        logo: newOrg.logo ?? null,
        isActive: true,
        createdAt: newOrg.createdAt,
        updatedAt: newOrg.updatedAt,
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

export async function setActiveNextAuthOrganization(
  params: SetActiveOrganizationParams,
): Promise<SetActiveOrganizationResult> {
  return {};
}
