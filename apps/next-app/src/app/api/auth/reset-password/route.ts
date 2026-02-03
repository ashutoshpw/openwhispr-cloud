import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "@repo/database";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: { message: "Invalid token", code: "INVALID_TOKEN" } },
        { status: 400 },
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        {
          error: { message: "Password is required", code: "MISSING_PASSWORD" },
        },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          error: {
            message: "Password must be at least 8 characters",
            code: "PASSWORD_TOO_SHORT",
          },
        },
        { status: 400 },
      );
    }

    // Find valid verification token
    const now = new Date();
    const verifications = await db()
      .select()
      .from(schema.verification)
      .where(
        and(
          eq(schema.verification.value, token),
          gt(schema.verification.expiresAt, now),
        ),
      )
      .limit(1);

    if (verifications.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid or expired reset token",
            code: "TOKEN_EXPIRED",
          },
        },
        { status: 400 },
      );
    }

    const verification = verifications[0];
    const userEmail = verification.identifier;

    // Find user
    const users = await db()
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, userEmail))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { error: { message: "User not found", code: "USER_NOT_FOUND" } },
        { status: 400 },
      );
    }

    const user = users[0];

    // Find credential account
    const accounts = await db()
      .select()
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, user.id),
          eq(schema.account.providerId, "credential"),
        ),
      )
      .limit(1);

    if (accounts.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: "No password account found for this user",
            code: "NO_PASSWORD_ACCOUNT",
          },
        },
        { status: 400 },
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db()
      .update(schema.account)
      .set({ password: hashedPassword })
      .where(eq(schema.account.id, accounts[0].id));

    // Delete used verification token
    await db()
      .delete(schema.verification)
      .where(eq(schema.verification.id, verification.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth] Reset password error:", error);
    return NextResponse.json(
      { error: { message: "Failed to reset password", code: "RESET_FAILED" } },
      { status: 500 },
    );
  }
}
