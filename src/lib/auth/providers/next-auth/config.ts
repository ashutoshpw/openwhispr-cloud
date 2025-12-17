import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getAuthConfig } from "../../config";
import { eq, and } from "drizzle-orm";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db(), {
    usersTable: schema.user as any,
    accountsTable: schema.account as any,
    verificationTokensTable: schema.verification as any,
  }),
  secret: getAuthConfig("next-auth").secret,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const users = await db()
          .select()
          .from(schema.user)
          .where(eq(schema.user.email, credentials.email as string))
          .limit(1);

        if (users.length === 0) {
          return null;
        }

        const accounts = await db()
          .select()
          .from(schema.account)
          .where(
            and(
              eq(schema.account.userId, users[0].id),
              eq(schema.account.providerId, "credential")
            )
          )
          .limit(1);

        if (accounts.length === 0 || !accounts[0].password) {
          return null;
        }

        const bcrypt = await import("bcryptjs");
        const isValid = await bcrypt.compare(
          credentials.password as string,
          accounts[0].password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: users[0].id,
          email: users[0].email,
          name: users[0].name,
          image: users[0].image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
    signOut: "/sign-out",
    error: "/sign-in",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
      }
      return session;
    },
  },
});
