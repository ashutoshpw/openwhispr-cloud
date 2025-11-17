# Clerk to BetterAuth Migration Guide

This document outlines the migration from Clerk authentication to BetterAuth for the Next.js 16 starter kit.

## Overview

BetterAuth is a modern, self-hosted authentication framework for TypeScript that offers:
- Full data ownership and control
- No vendor lock-in
- TypeScript-first design
- Framework-agnostic with excellent Next.js support
- Built-in security features (rate limiting, CSRF protection)
- Plugin ecosystem for advanced features

## Prerequisites

Before starting the migration, ensure you have:
1. A PostgreSQL database configured
2. Drizzle ORM set up
3. Node.js 18+ installed

## Migration Steps

### 1. Update Dependencies

**Remove Clerk:**
```bash
npm uninstall @clerk/nextjs svix
```

**Add BetterAuth:**
```bash
npm install better-auth --legacy-peer-deps
```

### 2. Environment Variables

Update your `.env` file:

**Remove:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
WEBHOOK_SECRET=
```

**Add:**
```env
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### 3. Database Schema Migration

BetterAuth requires the following tables:
- `user` - User information
- `session` - Active sessions
- `account` - Authentication accounts (email/password, OAuth)
- `verification` - Email verification tokens

**Generate the schema:**
```bash
# Create auth configuration first (see step 4)
npx @better-auth/cli generate --config lib/auth.ts --output lib/db/auth-schema.ts
```

**Apply migrations:**
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Or manually run the SQL to create the tables based on the schema in `lib/db/schema.ts`.

### 4. Create Auth Configuration

Create `lib/auth.ts`:
```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: "pg",
    schema,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  plugins: [nextCookies()],
});
```

### 5. Create Auth Client

Create `lib/auth-client.ts`:
```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { useSession, signIn, signUp, signOut } = authClient;
```

### 6. Create API Route Handler

Create `app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler);
```

### 7. Update Middleware

Update `middleware.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  if (pathname.startsWith("/dashboard")) {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### 8. Update Root Layout

Remove ClerkProvider from `app/layout.tsx`:

**Before:**
```typescript
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

**After:**
```typescript
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### 9. Update Components

**NavBar.tsx:**
```typescript
// Before
import { useAuth } from "@clerk/nextjs"
const { userId } = useAuth();

// After
import { useSession } from "@/lib/auth-client"
const { data: session } = useSession();
// Use: session?.user
```

**Profile.tsx:**
```typescript
// Before
import { SignOutButton, useUser } from "@clerk/nextjs"
const { user } = useUser();

// After
import { useSession, signOut } from "@/lib/auth-client"
const { data: session } = useSession();
const handleSignOut = async () => {
  await signOut();
  router.push("/");
};
```

### 10. Create Custom Auth Pages

**Sign In (`app/(auth)/sign-in/[[...sign-in]]/page.tsx`):**
```typescript
"use client"
import { authClient } from "@/lib/auth-client";

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await authClient.signIn.email({
    email,
    password,
  });
  router.push("/dashboard");
};
```

**Sign Up (`app/(auth)/sign-up/[[...sign-up]]/page.tsx`):**
```typescript
"use client"
import { authClient } from "@/lib/auth-client";

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await authClient.signUp.email({
    email,
    password,
    name,
  });
  router.push("/dashboard");
};
```

### 11. Remove Old Clerk Files

Delete the following:
- `app/api/auth/webhook/route.ts` (Clerk webhook handler)
- `utils/db/userCreate.ts` (if it was for Clerk webhooks)
- `utils/db/userUpdate.ts` (if it was for Clerk webhooks)

## Data Migration

If you have existing users in a Clerk-compatible schema, you'll need to migrate them:

1. **Export existing users** from your current database
2. **Transform the data** to match BetterAuth schema:
   - Map `user_id` → `id`
   - Map `first_name` + `last_name` → `name`
   - Set `emailVerified` based on your logic
   - Passwords will need to be reset (BetterAuth uses different hashing)
3. **Import users** into the new schema

**Note:** Users will need to reset their passwords as password hashes are not compatible between systems.

## Testing

After migration, test the following:
1. ✅ Sign up with new account
2. ✅ Sign in with credentials
3. ✅ Access protected routes (dashboard)
4. ✅ View user profile
5. ✅ Sign out
6. ✅ Middleware redirects work correctly
7. ✅ Session persistence

## Build and Deploy

```bash
# Build the project
npm run build

# Start the production server
npm start
```

## Key Differences

| Feature | Clerk | BetterAuth |
|---------|-------|------------|
| Hosting | SaaS (Clerk's servers) | Self-hosted (your database) |
| UI Components | Pre-built | Custom (you build) |
| User Management | Clerk Dashboard | Your admin interface |
| Pricing | Usage-based | Free (infrastructure costs only) |
| Data Control | Limited | Full control |
| Customization | Limited | Highly customizable |

## Troubleshooting

### Build Errors

**Error:** "DATABASE_URL environment variable is not set"
- **Solution:** Ensure `.env` file exists with proper DATABASE_URL

**Error:** "Cannot find module 'better-auth'"
- **Solution:** Run `npm install --legacy-peer-deps`

### Runtime Errors

**Error:** "Session not found"
- **Solution:** Check that middleware is properly configured with `runtime: "nodejs"`

**Error:** "Failed to sign in"
- **Solution:** Verify database tables are created and credentials are correct

## Additional Resources

- [BetterAuth Documentation](https://www.better-auth.com/docs)
- [BetterAuth GitHub](https://github.com/better-auth/better-auth)
- [Next.js Integration Guide](https://www.better-auth.com/docs/integrations/next)
- [Drizzle ORM Adapter](https://www.better-auth.com/docs/adapters/drizzle)

## Security Considerations

1. **Always use HTTPS in production** - BetterAuth relies on secure cookies
2. **Keep BETTER_AUTH_SECRET secure** - Never commit to version control
3. **Enable rate limiting** - Protect against brute force attacks
4. **Enable email verification** - Set `requireEmailVerification: true` in production
5. **Regular security updates** - Keep BetterAuth and dependencies updated

## Next Steps

Consider adding these BetterAuth features:
- OAuth providers (Google, GitHub, etc.)
- Two-factor authentication
- Magic link authentication
- Password reset functionality
- Email verification
- Account recovery options

## Support

For issues specific to this migration:
1. Check the [BetterAuth documentation](https://www.better-auth.com/docs)
2. Review [GitHub discussions](https://github.com/better-auth/better-auth/discussions)
3. Check Next.js 16 compatibility notes
