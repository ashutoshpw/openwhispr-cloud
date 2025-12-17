# NextAuth Provider

NextAuth (Auth.js v5) provider implementation for the unified auth layer.

## Setup

1. Install dependencies:
   ```bash
   bun install next-auth @auth/drizzle-adapter bcryptjs nanoid
   ```

2. Set environment variables in `.env.local`:
   ```env
   AUTH_PROVIDER=next-auth
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

3. Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

## Features Supported

- ✅ Email/Password authentication
- ✅ OAuth providers (Google, GitHub, etc.)
- ⚠️ Organization/Workspace management (custom implementation)
- ✅ Session management
- ✅ JWT sessions

## Configuration

NextAuth configuration is in `src/lib/auth/providers/next-auth/config.ts`.

Key settings:
- `adapter`: Drizzle adapter for database
- `providers`: Authentication providers (Credentials, OAuth, etc.)
- `session.strategy`: Session strategy (JWT or database)

## Organization Feature

NextAuth does not have built-in organization support. A custom implementation is provided in `src/lib/auth/providers/next-auth/organization.ts`.

The implementation:
- Uses direct database queries
- Manages organization membership via the `member` table
- Provides the same API as BetterAuth's organization feature

## Notes

- NextAuth uses the same database schema as BetterAuth (compatible)
- Custom organization implementation may have limitations
- Some NextAuth-specific features may not be available through the unified API

## Known Issues

- Organization feature is a custom implementation and may not have full feature parity with BetterAuth
- Sign up flow requires a custom API route (not yet implemented in this version)

