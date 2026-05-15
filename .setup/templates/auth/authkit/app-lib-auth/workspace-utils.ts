/**
 * Workspace utilities for AuthKit
 *
 * Provides organization and project management utilities.
 * AuthKit uses local database for workspace management.
 */
import "server-only";

import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { eq, and } from "@repo/database";
import { nanoid } from "nanoid";
import { getSession } from "./index";

import type {
  Organization,
  Project,
  CreateOrganizationParams,
  CreateOrganizationResult,
  ListOrganizationsResult,
  SetActiveOrganizationParams,
  SetActiveOrganizationResult,
  CreateProjectParams,
  CreateProjectResult,
  ListProjectsResult,
  UpdateProjectParams,
  UpdateProjectResult,
  DeleteProjectResult,
} from "@repo/auth/types";

/**
 * Get organizations for the current user
 */
export async function getOrganizations(): Promise<ListOrganizationsResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: { message: "Not authenticated" } };
    }

    const memberships = await db()
      .select({
        organization: schema.organization,
      })
      .from(schema.member)
      .innerJoin(
        schema.organization,
        eq(schema.member.organizationId, schema.organization.id),
      )
      .where(eq(schema.member.userId, session.user.id));

    const organizations: Organization[] = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      createdAt: m.organization.createdAt ?? undefined,
      updatedAt: m.organization.updatedAt ?? undefined,
    }));

    return { data: organizations };
  } catch (error) {
    console.error("[Workspace] Error getting organizations:", error);
    return {
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to get organizations",
      },
    };
  }
}

/**
 * Create a new organization
 */
export async function createOrganization(
  params: CreateOrganizationParams,
): Promise<CreateOrganizationResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: { message: "Not authenticated" } };
    }

    const orgId = nanoid();
    const now = new Date();

    await db().insert(schema.organization).values({
      id: orgId,
      name: params.name,
      slug: params.slug,
      createdAt: now,
      updatedAt: now,
    });

    // Add creator as owner
    await db().insert(schema.member).values({
      id: nanoid(),
      userId: session.user.id,
      organizationId: orgId,
      role: "owner",
      createdAt: now,
    });

    const organization: Organization = {
      id: orgId,
      name: params.name,
      slug: params.slug,
      createdAt: now,
      updatedAt: now,
    };

    return { data: organization };
  } catch (error) {
    console.error("[Workspace] Error creating organization:", error);
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

/**
 * Set the active organization
 * Note: AuthKit doesn't have built-in org switching, this is stored in session/cookie
 */
export async function setActiveOrganization(
  _params: SetActiveOrganizationParams,
): Promise<SetActiveOrganizationResult> {
  // This would typically be handled by setting a cookie or session value
  // For now, return success - implement cookie setting as needed
  return {};
}

/**
 * Get projects for an organization
 */
export async function getProjects(
  organizationId: string,
): Promise<ListProjectsResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: { message: "Not authenticated" } };
    }

    const projectRecords = await db()
      .select()
      .from(schema.project)
      .where(eq(schema.project.organizationId, organizationId));

    const projects: Project[] = projectRecords.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      organizationId: p.organizationId,
      isDefault: p.isDefault ?? false,
      createdAt: p.createdAt ?? undefined,
      updatedAt: p.updatedAt ?? undefined,
    }));

    return { data: projects };
  } catch (error) {
    console.error("[Workspace] Error getting projects:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to get projects",
      },
    };
  }
}

/**
 * Create a new project
 */
export async function createProject(
  params: CreateProjectParams,
): Promise<CreateProjectResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: { message: "Not authenticated" } };
    }

    const projectId = nanoid();
    const now = new Date();

    await db().insert(schema.project).values({
      id: projectId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      organizationId: params.organizationId,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    });

    const project: Project = {
      id: projectId,
      name: params.name,
      slug: params.slug,
      description: params.description,
      organizationId: params.organizationId,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    return { data: project };
  } catch (error) {
    console.error("[Workspace] Error creating project:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to create project",
      },
    };
  }
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  params: UpdateProjectParams,
): Promise<UpdateProjectResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: { message: "Not authenticated" } };
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (params.name !== undefined) updates.name = params.name;
    if (params.slug !== undefined) updates.slug = params.slug;
    if (params.description !== undefined)
      updates.description = params.description;

    await db()
      .update(schema.project)
      .set(updates)
      .where(eq(schema.project.id, projectId));

    const projectRecords = await db()
      .select()
      .from(schema.project)
      .where(eq(schema.project.id, projectId))
      .limit(1);

    if (projectRecords.length === 0) {
      return { error: { message: "Project not found" } };
    }

    const p = projectRecords[0];
    const project: Project = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      organizationId: p.organizationId,
      isDefault: p.isDefault ?? false,
      createdAt: p.createdAt ?? undefined,
      updatedAt: p.updatedAt ?? undefined,
    };

    return { data: project };
  } catch (error) {
    console.error("[Workspace] Error updating project:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to update project",
      },
    };
  }
}

/**
 * Delete a project
 */
export async function deleteProject(
  projectId: string,
): Promise<DeleteProjectResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { error: { message: "Not authenticated" } };
    }

    await db().delete(schema.project).where(eq(schema.project.id, projectId));

    return { success: true };
  } catch (error) {
    console.error("[Workspace] Error deleting project:", error);
    return {
      error: {
        message:
          error instanceof Error ? error.message : "Failed to delete project",
      },
    };
  }
}
