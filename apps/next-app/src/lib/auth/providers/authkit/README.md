# AuthKit (WorkOS) Provider

WorkOS AuthKit provider implementation for the unified auth layer.

## Setup

1. Install dependencies (already included in package.json):
   ```bash
   bun install @workos-inc/authkit-nextjs @workos-inc/node
   ```

2. Set environment variables in `.env.local`:
   ```env
   AUTH_PROVIDER=authkit
   WORKOS_API_KEY=sk_xxx
   WORKOS_CLIENT_ID=client_xxx
   WORKOS_COOKIE_PASSWORD=your-complex-password-at-least-32-characters-long
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Get your WorkOS credentials:
   - Sign up at [workos.com](https://workos.com)
   - Get your API Key from the WorkOS Dashboard
   - Get your Client ID from the WorkOS Dashboard
   - Generate a secure cookie password (at least 32 characters):
     ```bash
     openssl rand -base64 32
     ```

## Features Supported

- ✅ Email/Password authentication
- ✅ OAuth providers (via WorkOS)
- ⚠️ Organization/Workspace management (via WorkOS organizations)
- ✅ Session management
- ✅ Magic link authentication (via WorkOS)

## Configuration

AuthKit configuration uses WorkOS environment variables:

- `WORKOS_API_KEY`: Your WorkOS API key (required)
- `WORKOS_CLIENT_ID`: Your WorkOS Client ID (required)
- `WORKOS_COOKIE_PASSWORD`: Password for sealing session cookies (required, min 32 chars)
- `NEXT_PUBLIC_APP_URL`: Base URL of your application

## Authentication Flow

WorkOS AuthKit uses a redirect-based authentication flow:

1. Server-side: Use `withAuth()` to get the current user
2. Client-side: Use `useAuth()` hook from `@workos-inc/authkit-nextjs/components`
3. Sign-in/Sign-up: Handled through WorkOS hosted UI or custom flows

## Email/Password Authentication

For email/password authentication, the implementation uses WorkOS User Management API:

- `signInEmail()`: Authenticates user with email and password
- `signUpEmail()`: Creates a new user and authenticates them

## Session Management

Sessions are managed using WorkOS's sealed cookie mechanism for security.

## Notes

- AuthKit uses WorkOS's infrastructure for authentication
- Organization features are available through WorkOS organizations
- The provider supports both redirect-based and API-based authentication
- Session cookies are encrypted using the `WORKOS_COOKIE_PASSWORD`

## Known Limitations

- Email/password authentication requires WorkOS User Management API
- Some features may require WorkOS-specific configuration in the WorkOS Dashboard
- OAuth providers must be configured in the WorkOS Dashboard

