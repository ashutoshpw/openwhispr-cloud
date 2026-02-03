"use server";

import { createClerkClient } from "@clerk/backend";
import { getAuthConfig } from "@repo/auth/config";
import { db } from "@repo/database";
import { project } from "@repo/database/schema";
import type {
  ListOrganizationsResult,
  CreateOrganizationParams,
  CreateOrganizationResult,
  SetActiveOrganizationParams,
  SetActiveOrganizationResult,
} from "@repo/auth/types";
import { canUserCreateFreeWorkspace } from "@/lib/billing";

function getClerkClient() {
  const config = getAuthConfig("clerk-dev");
  return createClerkClient({
    secretKey: config.secretKey,
  });
}

export async function listClerkOrganizations(): Promise<ListOrganizationsResult> {
  try {
    const { auth } = await import("@clerk/nextjs/server");

    const { userId } = await auth();

    if (!userId) {
      return {
        error: {
          message: "Unauthorized",
        },
      };
    }

    const clerkClient = getClerkClient();

    const response = await clerkClient.users.getOrganizationMembershipList({
      userId,
    });

    const organizations = response.data.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug || membership.organization.id,
      logo: membership.organization.imageUrl || null,
      isActive: false,
      createdAt: new Date(membership.organization.createdAt),
      updatedAt: new Date(membership.organization.updatedAt),
    }));

    return {
      data: organizations,
    };
  } catch (error) {
    console.error("[listClerkOrganizations] Error:", error);
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

export async function createClerkOrganization(
  params: CreateOrganizationParams,
): Promise<CreateOrganizationResult> {
  try {
    const { auth } = await import("@clerk/nextjs/server");

    const { userId } = await auth();

    if (!userId) {
      return {
        error: {
          message: "Unauthorized",
        },
      };
    }

    // Check if user can create a free workspace
    // This is for free tier only - paid workspaces go through checkout flow
    const canCreateFree = await canUserCreateFreeWorkspace(userId);
    if (!canCreateFree) {
      return {
        error: {
          message:
            "You already have a free workspace. Please upgrade your existing workspace or create a paid workspace.",
          code: "FREE_WORKSPACE_LIMIT_REACHED",
        },
      };
    }

    const clerkClient = getClerkClient();

    const organization = await clerkClient.organizations.createOrganization({
      name: params.name,
      slug: params.slug,
      createdBy: userId,
    });

    // Create default project for the new organization
    const { nanoid } = await import("nanoid");
    await db().insert(project).values({
      id: nanoid(),
      name: "Default Project",
      slug: "default",
      organizationId: organization.id,
      isDefault: true,
    });

    return {
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug || organization.id,
        logo: organization.imageUrl || null,
        isActive: false,
        createdAt: new Date(organization.createdAt),
        updatedAt: new Date(organization.updatedAt),
      },
    };
  } catch (error) {
    console.error("[createClerkOrganization] Error:", error);
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

export async function setActiveClerkOrganization(
  params: SetActiveOrganizationParams,
): Promise<SetActiveOrganizationResult> {
  return {};
}
