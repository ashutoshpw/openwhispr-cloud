"use server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const template = async () => {
  try {
    const users = await db().select().from(user);

    return users;
  } catch (error: any) {
    console.error("Error fetching users:", error);
    throw new Error(error.message);
  }
};
