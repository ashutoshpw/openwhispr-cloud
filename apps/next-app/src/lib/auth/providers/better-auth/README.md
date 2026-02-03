# BetterAuth Provider

BetterAuth provider implementation for the unified auth layer.

## Setup

1. Install dependencies (already included in package.json):
   ```bash
   bun install
   ```

2. Set environment variables in `.env.local`:
   ```env
   AUTH_PROVIDER=better-auth
   BETTER_AUTH_SECRET=your-secret-key-here
   BETTER_AUTH_URL=http://localhost:3000  # Optional, defaults to NEXT_PUBLIC_APP_URL
   ```

3. Generate a secure secret:
   ```bash
   openssl rand -base64 32
   ```

## Features Supported

- ✅ Email/Password authentication
- ✅ OAuth providers (Google, GitHub, etc.)
- ✅ Organization/Workspace management
- ✅ Session management
- ✅ Email verification (configurable)

## Configuration

BetterAuth configuration is in `src/lib/auth/providers/better-auth/server.ts`.

Key settings:
- `emailAndPassword.enabled`: Enable email/password auth
- `requireEmailVerification`: Require email verification
- `minPasswordLength`: Minimum password length (default: 8)
- `session.cookieCache`: Session caching configuration

## Organization Feature

BetterAuth includes built-in organization/workspace support via the organization plugin.

Endpoints:
- `GET /api/auth/organization/list` - List user's organizations
- `POST /api/auth/organization/create` - Create new organization
- `POST /api/auth/organization/set-active` - Set active organization

## Notes

- BetterAuth uses its own database schema
- Organization plugin is automatically enabled
- All BetterAuth features are available through the unified API

