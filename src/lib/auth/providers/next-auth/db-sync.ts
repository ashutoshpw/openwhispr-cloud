import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function createNextAuthSessionInDb(
  cookieHeader: string,
  userId: string,
  expiresAt: Date,
  userEmail?: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<string | null> {
  try {
    const sessionTokenMatch = cookieHeader.match(
      /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=([^;]+)/
    );
    
    if (!sessionTokenMatch || !sessionTokenMatch[1]) {
      return null;
    }
    
    const sessionToken = decodeURIComponent(sessionTokenMatch[1]);
    
    let dbUserId = userId;
    const existingUsers = await db()
      .select()
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    
    if (existingUsers.length === 0 && userEmail) {
      const usersByEmail = await db()
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, userEmail))
        .limit(1);
      
      if (usersByEmail.length > 0) {
        dbUserId = usersByEmail[0].id;
      } else {
        console.warn(`[NextAuth DB Sync] User ${userId} (email: ${userEmail}) not found in database. Skipping session creation.`);
        return null;
      }
    }
    
    const existingSessions = await db()
      .select()
      .from(schema.session)
      .where(eq(schema.session.token, sessionToken))
      .limit(1);
    
    if (existingSessions.length > 0) {
      await db()
        .update(schema.session)
        .set({
          userId: dbUserId,
          expiresAt: expiresAt,
          updatedAt: new Date(),
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        })
        .where(eq(schema.session.token, sessionToken));
      return existingSessions[0].id;
    }
    
    const sessionId = nanoid();
    await db().insert(schema.session).values({
      id: sessionId,
      token: sessionToken,
      userId: dbUserId,
      expiresAt: expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
    
    return sessionId;
  } catch (error) {
    return null;
  }
}

export async function deleteNextAuthSessionFromDb(
  cookieHeader: string
): Promise<void> {
  try {
    const sessionTokenMatch = cookieHeader.match(
      /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token=([^;]+)/
    );
    
    if (!sessionTokenMatch || !sessionTokenMatch[1]) {
      return;
    }
    
    const sessionToken = decodeURIComponent(sessionTokenMatch[1]);
    
    await db()
      .delete(schema.session)
      .where(eq(schema.session.token, sessionToken));
  } catch (error) {
    console.error("[NextAuth DB Sync] Error deleting session from DB:", error);
  }
}

