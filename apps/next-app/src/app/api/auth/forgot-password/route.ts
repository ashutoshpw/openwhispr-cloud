import { db } from "@repo/database";
import * as schema from "@repo/database/schema";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkPasswordResetRateLimit } from "@/lib/rate-limit";
import { randomBytes } from "node:crypto";
import { eq } from "@repo/database";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      // Always return success to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limit
    const rateLimit = await checkPasswordResetRateLimit(normalizedEmail);
    if (!rateLimit.success) {
      // Still return success to prevent enumeration
      console.log(`[Auth] Password reset rate limited for ${normalizedEmail}`);
      return NextResponse.json({ success: true });
    }

    // Find user by email
    const users = await db()
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, normalizedEmail))
      .limit(1);

    if (users.length === 0) {
      // User not found, but still return success to prevent enumeration
      return NextResponse.json({ success: true });
    }

    const user = users[0];

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Store verification token
    await db().insert(schema.verification).values({
      id: nanoid(),
      identifier: normalizedEmail,
      value: token,
      expiresAt,
    });

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8801";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send email (or log to console if not configured)
    void sendPasswordResetEmail({
      to: normalizedEmail,
      resetUrl,
      token,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth] Forgot password error:", error);
    // Return success even on error to prevent enumeration
    return NextResponse.json({ success: true });
  }
}
