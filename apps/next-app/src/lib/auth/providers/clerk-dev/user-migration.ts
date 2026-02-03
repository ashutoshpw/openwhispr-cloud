import "server-only";

import type { createClerkClient } from "@clerk/backend";

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export async function checkUserExistsInClerk(
  email: string,
  clerkClient: ReturnType<typeof createClerkClient>,
): Promise<boolean> {
  try {
    const userList = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    return userList.data.length > 0;
  } catch (error) {
    console.error("[Clerk Migration] Error checking user existence:", error);
    return false;
  }
}

export async function createUserInClerk(
  localUser: LocalUser,
  password: string,
  clerkClient: ReturnType<typeof createClerkClient>,
): Promise<string | null> {
  try {
    const nameParts = (localUser.name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || null;

    const createParams: any = {
      emailAddress: [localUser.email],
      password: password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      skipPasswordChecks: false,
      skipPasswordRequirement: false,
    };

    if (localUser.image) {
      createParams.unsafeMetadata = { image: localUser.image };
    }

    const createdUser = await clerkClient.users.createUser(createParams);

    return createdUser.id;
  } catch (error: any) {
    if (error?.errors?.[0]?.code === "form_identifier_exists") {
      console.log("[Clerk Migration] User already exists in Clerk");
      return null;
    }
    console.error("[Clerk Migration] Error creating user in Clerk:", error);
    throw error;
  }
}
