import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const userUpdateSchema = z.object({
  email: z
    .string()
    .email({ message: "Invalid email" })
    .nonempty({ message: "Email is required" })
    .describe("user email"),
  first_name: z
    .string()
    .regex(/^[a-zA-Z]+$/, { message: "First name must only contain letters" })
    .describe("user first name"),
  last_name: z
    .string()
    .regex(/^[a-zA-Z]+$/, { message: "Last name must only contain letters" })
    .describe("user last name"),
  profile_image_url: z
    .string()
    .url({ message: "Invalid URL" })
    .optional()
    .describe("user profile image URL"),
  user_id: z.string().describe("user ID"),
});

type userUpdateProps = z.infer<typeof userUpdateSchema>;

export const userUpdate = async ({
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: userUpdateProps) => {
  try {
    const data = await db()
      .update(user)
      .set({
        email,
        first_name,
        last_name,
        profile_image_url,
        user_id,
      })
      .where(eq(user.email, email))
      .returning();

    return data;
  } catch (error: any) {
    console.error("error", error);
    throw new Error(error.message);
  }
};
