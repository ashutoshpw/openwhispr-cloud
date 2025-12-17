# Clerk Provider

Clerk provider implementation for the unified auth layer.

## Setup

1. Install dependencies (already included in package.json):
   ```bash
   pnpm install @clerk/nextjs
   ```

2. Set environment variables in `.env.local`:
   ```env
   AUTH_PROVIDER=clerk-dev
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. Get your Clerk credentials:
   - Sign up at [clerk.com](https://clerk.com)
   - Get your Publishable Key from the Clerk Dashboard
   - Get your Secret Key from the Clerk Dashboard

**Note**: The `ClerkProvider` wrapper is automatically added via `AuthProviderWrapper` when `AUTH_PROVIDER=clerk-dev`. No manual configuration needed in the root layout!

## Features Supported

- ✅ Email/Password authentication (via Clerk UI components)
- ✅ OAuth providers (via Clerk)
- ✅ Organization/Workspace management (via Clerk organizations)
- ✅ Session management
- ✅ Multi-factor authentication (via Clerk)

## Configuration

Clerk configuration uses environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key (required)
- `CLERK_SECRET_KEY`: Your Clerk secret key (required)
- `NEXT_PUBLIC_APP_URL`: Base URL of your application

## Authentication Flow

Clerk uses a component-based authentication flow:

1. Server-side: Use `auth()` and `currentUser()` from `@clerk/nextjs/server`
2. Client-side: Use `useAuth()` and `useUser()` hooks from `@clerk/nextjs`
3. Sign-in/Sign-up: Handled through Clerk's pre-built UI components

## Email/Password Authentication

Clerk supports client-side programmatic authentication through the unified auth interface:

- **Sign-in**: Use `signIn.email()` from `@/lib/auth-client` - works programmatically via Clerk's client SDK
- **Sign-up**: Use `signUp.email()` from `@/lib/auth-client` - works programmatically via Clerk's client SDK
- **Sign-out**: Use `signOut()` from `@/lib/auth-client` - works programmatically via Clerk's client SDK

The unified auth methods automatically use Clerk's client SDK when `AUTH_PROVIDER=clerk-dev` is set. You can also use Clerk's UI components (`<SignIn />`, `<SignUp />`) if preferred, but the programmatic methods work seamlessly with the unified interface.

## Session Management

Sessions are automatically managed by Clerk and stored securely.

## Middleware Setup

Route protection is handled automatically through the unified auth middleware system when `AUTH_PROVIDER=clerk-dev` is set. The existing middleware:

- Protects `/dashboard` and `/adminx` routes using Clerk's server-side session checking
- Works with Clerk's `auth()` and `currentUser()` functions from `@clerk/nextjs/server`
- Integrates with existing CORS handling
- Works seamlessly with the unified auth abstraction

No additional Clerk-specific middleware configuration is needed - the unified auth system handles everything!

## Notes

- Clerk uses its own infrastructure for authentication
- Organization features are available through Clerk organizations
- The `ClerkProvider` wrapper is automatically added via `AuthProviderWrapper` component
- All authentication UI is handled through Clerk's components
- Middleware is automatically configured when Clerk is active
- The implementation is fully conditional - no impact when other providers are used

## Implementation Details

- **Client-Side Only**: All authentication (sign-in, sign-up, sign-out) is handled client-side using Clerk's client SDK
- **Server-Side Session Retrieval**: Sessions are retrieved server-side using Clerk's `auth()` and `currentUser()` helpers
- **Conditional Loading**: Clerk code only loads when `AUTH_PROVIDER=clerk-dev` - no impact when other providers are used
- **Automatic Setup**: ClerkProvider is automatically added via `AuthProviderWrapper` when Clerk is the active provider

## Known Limitations

- Requires ClerkProvider wrapper in the application root (automatically configured)
- Client-side authentication requires ClerkProvider context to be available
- Some advanced features may require Clerk-specific configuration in the Clerk Dashboard
- Two-factor authentication and other MFA features are supported but may require additional setup

