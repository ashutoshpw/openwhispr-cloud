import { z } from "zod";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

const userCreateSchema = z.object({
  email: z
    .string()
    .email({ message: "Invalid email" })
    .describe("user email"),
  first_name: z
    .string()
    .regex(/^[a-zA-Z]+$/, { message: "First name must only contain letters" })
    .min(3, { message: "First name is required" })
    .describe("user first name"),
  last_name: z
    .string()
    .regex(/^[a-zA-Z]+$/, { message: "Last name must only contain letters" })
    .min(3, { message: "Last name is required" })
    .describe("user last name"),
  profile_image_url: z
    .string()
    .url({ message: "Invalid URL" })
    .optional()
    .describe("user profile image URL"),
  user_id: z.string().describe("user ID"),
});

type userCreateProps = z.infer<typeof userCreateSchema>;

export const userCreate = async ({
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: userCreateProps) => {
  try {
    const data = await db()
      .insert(user)
      .values({
        email,
        first_name,
        last_name,
        profile_image_url,
        user_id,
      })
      .returning();

    console.log("data", data);

    return data;
  } catch (error: any) {
    console.error("error", error);
    throw new Error(error.message);
  }
};
