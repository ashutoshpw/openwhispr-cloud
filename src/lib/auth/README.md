# Unified Auth Layer

A provider-agnostic authentication abstraction layer that allows switching between different authentication providers (BetterAuth, NextAuth, etc.) without changing application code.

## Architecture Overview

The unified auth layer consists of three main components:

1. **Core Layer** (`src/lib/auth/core/`): Unified interfaces and APIs
2. **Providers** (`src/lib/auth/providers/`): Isolated provider implementations
3. **Unified Exports** (`src/lib/auth/index.ts`, `src/lib/auth-client.ts`): Single API surface

## How It Works

1. The provider is selected via the `AUTH_PROVIDER` environment variable
2. The provider factory (`src/lib/auth/providers/index.ts`) loads the appropriate adapter
3. All authentication operations go through the unified API interface
4. Provider-specific implementations handle the actual authentication logic

## Switching Providers

To switch providers, simply change the `AUTH_PROVIDER` environment variable:

```bash
# Use BetterAuth (default)
AUTH_PROVIDER=better-auth

# Use NextAuth
AUTH_PROVIDER=next-auth

# Use AuthKit (WorkOS)
AUTH_PROVIDER=authkit

# Use Clerk
AUTH_PROVIDER=clerk-dev
```

No code changes are required - the application will automatically use the selected provider.

## Adding New Providers

To add a new authentication provider:

1. Create a new directory in `src/lib/auth/providers/your-provider/`
2. Implement the `AuthAdapter` interface from `src/lib/auth/core/types.ts`
3. Add the provider case to `src/lib/auth/providers/index.ts`
4. Update the configuration in `src/lib/auth/config.ts`

See the existing BetterAuth, NextAuth, AuthKit, and Clerk implementations for reference.

## Provider Comparison

| Feature | BetterAuth | NextAuth | AuthKit | Clerk |
|---------|-----------|----------|---------|-------|
| Email/Password | ✅ | ✅ | ✅ | ✅ (UI) |
| OAuth Providers | ✅ | ✅ | ✅ | ✅ |
| Organization/Workspace | ✅ | ⚠️ (Custom) | ✅ | ✅ |
| Session Management | ✅ | ✅ | ✅ | ✅ |
| Database Schema | Custom | Compatible | WorkOS | Clerk |
| UI Components | Optional | Optional | Optional | Built-in |

## Known Limitations

- Organization feature requires custom implementation for NextAuth
- Some provider-specific features may not be available across all providers
- AuthKit requires WorkOS account and configuration
- Clerk requires ClerkProvider wrapper and uses UI components for authentication
- See `docs/AUTH_LIMITATIONS.md` for detailed limitations

## Provider-Specific Documentation

- [BetterAuth Provider](./providers/better-auth/README.md)
- [NextAuth Provider](./providers/next-auth/README.md)
- [AuthKit Provider](./providers/authkit/README.md)
- [Clerk Provider](./providers/clerk-dev/README.md)

