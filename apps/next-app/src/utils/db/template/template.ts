"use server";
import { db } from "@repo/database";
import { user } from "@repo/database/schema";

export const template = async () => {
  try {
    const users = await db().select().from(user);

    return users;
  } catch (error: any) {
    console.error("Error fetching users:", error);
    throw new Error(error.message);
  }
};
