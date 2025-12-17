# NextJS 16 Starter Kit

A modern, production-ready Next.js 16 starter template for building full-stack web applications with authentication, database integration, and a comprehensive UI component library.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8)](https://tailwindcss.com/)

## ✨ Features

- 🚀 **Next.js 16** with App Router for optimal performance
- 🔐 **Unified Authentication** - Switchable auth layer supporting BetterAuth, NextAuth, AuthKit (WorkOS), and Clerk
- 💾 **Database** with PostgreSQL and Drizzle ORM for type-safe queries
- 🎨 **Beautiful UI** with Shadcn UI, TailwindCSS, and multiple component libraries
- 📝 **Forms** with React Hook Form and Zod validation
- 🔄 **State Management** using TanStack Query for server state
- ⚡ **Rate Limiting & Caching** with Redis/Upstash
- 💳 **Payment Integration** with Stripe (optional)
- 🤖 **ChatGPT Apps SDK** with Model Context Protocol (MCP) support for AI integration
- 🐳 **Docker Support** for easy local development
- 📊 **Database Studio** with Drizzle Studio for visual database management

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 with App Router |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS |
| UI Components | Shadcn UI, Radix UI, Tremor, Magic UI |
| Authentication | Unified Auth Layer (BetterAuth, NextAuth, AuthKit/WorkOS, Clerk) |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Forms | React Hook Form + Zod |
| State Management | TanStack Query (React Query) |
| API Layer | tRPC (TypeScript RPC) |
| Caching | Redis (Upstash) |
| Payments | Stripe (optional) |
| AI Integration | ChatGPT Apps SDK + MCP |
| Content | MDX (next-mdx-remote) |
| Icons | Lucide React, Tabler Icons |
| Animations | Framer Motion |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or remote)
- Unified Auth Layer - Switch between BetterAuth, NextAuth, AuthKit (WorkOS), or Clerk

### Quick Start with Docker (Recommended)

The fastest way to get started is using Docker Compose, which sets up everything automatically:

1. **Clone the repository**
   ```bash
   git clone https://github.com/W3DevStarter/nextjs16-starter-kit.git
   cd nextjs16-starter-kit
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and configure your authentication provider (see [Environment Variables](#-environment-variables) section)

3. **Start with Docker Compose**
   ```bash
   docker compose up
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Next.js application on http://localhost:3000

   The database schema will be automatically pushed on startup.

4. **Stop the services**
   ```bash
   docker compose down
   ```

5. **Rebuild after changes**
   ```bash
   docker compose up --build
   ```

### Manual Setup (Without Docker)

If you prefer to run services manually:

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/W3DevStarter/nextjs16-starter-kit.git
   cd nextjs16-starter-kit
   npm install --legacy-peer-deps
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and fill in all required variables (see below)

3. **Set up PostgreSQL database**
   
   Make sure you have a PostgreSQL database running and update the `DATABASE_URL` in `.env.local`

4. **Push the database schema**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to http://localhost:3000

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create production build |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint to check code quality |
| `npm run db:generate` | Generate migration files from schema changes |
| `npm run db:migrate` | Apply migrations to database |
| `npm run db:push` | Push schema to database directly (development) |
| `npm run db:studio` | Open Drizzle Studio GUI for database management |

## 🗄️ Database Management

### Development Workflow

For development, use `db:push` to quickly sync schema changes:

```bash
npm run db:push
```

### Production Workflow

For production, use migrations:

1. Make changes to `src/lib/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Apply migration: `npm run db:migrate`

### Drizzle Studio

Explore and edit your database with a visual interface:

```bash
npm run db:studio
```

This opens a web interface at http://localhost:4983

## 🔐 Environment Variables

Create a `.env.local` file with the following variables:

### Required - Database

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter
```

### Required - Authentication Provider

The application supports multiple authentication providers. Choose **one** provider and set the corresponding environment variables:

**Important**: Set the `NEXT_PUBLIC_AUTH_PROVIDER` environment variable to switch between providers. No code changes are required.

#### Option 1: BetterAuth (Default)

BetterAuth is a modern, self-hosted authentication solution with built-in organization support.

```bash
# Generate a secure secret (run this command)
openssl rand -base64 32
```

```env
NEXT_PUBLIC_AUTH_PROVIDER=better-auth
BETTER_AUTH_SECRET=<your-generated-secret>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Features**: Email/Password, OAuth, Organizations, Email Verification

**Documentation**: See [BetterAuth Provider README](./src/lib/auth/providers/better-auth/README.md)

#### Option 2: NextAuth (Auth.js v5)

NextAuth is a popular authentication library for Next.js applications.

```bash
# Generate a secure secret (run this command)
openssl rand -base64 32
```

```env
NEXT_PUBLIC_AUTH_PROVIDER=next-auth
NEXTAUTH_SECRET=<your-generated-secret>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Features**: Email/Password, OAuth, JWT Sessions, Custom Organization Support

**Documentation**: See [NextAuth Provider README](./src/lib/auth/providers/next-auth/README.md)

#### Option 3: AuthKit (WorkOS)

WorkOS AuthKit provides enterprise-grade authentication with SSO and organization management.

```bash
# Generate a secure cookie password (run this command)
openssl rand -base64 32
```

```env
NEXT_PUBLIC_AUTH_PROVIDER=authkit
WORKOS_API_KEY=sk_xxx
WORKOS_CLIENT_ID=client_xxx
WORKOS_COOKIE_PASSWORD=<your-generated-password-min-32-chars>
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Features**: Email/Password, OAuth, SSO, Organizations, Magic Links

**Get Credentials**: Sign up at [workos.com](https://workos.com)

**Documentation**: See [AuthKit Provider README](./src/lib/auth/providers/authkit/README.md)

#### Option 4: Clerk

Clerk provides a complete authentication solution with pre-built UI components.

```env
NEXT_PUBLIC_AUTH_PROVIDER=clerk-dev
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Features**: Email/Password, OAuth, Organizations, Multi-Factor Authentication, Pre-built UI

**Get Credentials**: Sign up at [clerk.com](https://clerk.com)

**Documentation**: See [Clerk Provider README](./src/lib/auth/providers/clerk-dev/README.md)

**Note**: You can switch providers at any time by changing the `NEXT_PUBLIC_AUTH_PROVIDER` environment variable. See [Unified Auth Layer Documentation](./src/lib/auth/README.md) for more details.

### Optional - Stripe Payments

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Optional - Upstash Redis (Rate Limiting & Caching)

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## 📁 Project Structure

```
nextjs16-starter-kit/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication routes
│   │   ├── (marketing)/       # Public marketing pages
│   │   ├── adminx/            # Admin panel routes
│   │   ├── api/               # API routes and webhooks
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── payments/      # Stripe webhooks
│   │   │   └── admin/         # Admin API endpoints
│   │   ├── blog/              # Blog pages
│   │   ├── dashboard/         # Protected dashboard routes
│   │   ├── mcp/               # Model Context Protocol endpoints
│   │   ├── privacy/           # Privacy policy page
│   │   ├── terms/             # Terms of service page
│   │   ├── hooks/             # Custom React hooks
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── provider.tsx       # App providers
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── admin/             # Admin components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── form/              # Form components
│   │   ├── LandingPage/       # Landing page sections
│   │   ├── magicui/           # Magic UI components
│   │   ├── ui/                # Shadcn UI components
│   │   ├── AuthProviderWrapper.tsx
│   │   ├── NavBar.tsx         # Navigation component
│   │   └── Profile.tsx         # User profile component
│   ├── lib/                   # Core utilities
│   │   ├── auth/              # Unified authentication layer
│   │   │   ├── core/          # Core interfaces and APIs
│   │   │   └── providers/     # Provider implementations
│   │   │       ├── better-auth/
│   │   │       ├── next-auth/
│   │   │       ├── authkit/   # WorkOS AuthKit
│   │   │       └── clerk-dev/ # Clerk
│   │   ├── db/                # Database config and schema
│   │   ├── auth-client.ts     # Client-side auth utilities
│   │   ├── auth-utils.ts      # Auth helper functions
│   │   ├── mdx.ts             # MDX content processing
│   │   ├── ratelimiter.ts    # Rate limiting with Upstash
│   │   ├── redis.ts           # Redis client (Upstash)
│   │   └── utils.ts           # Helper functions
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   └── middleware.ts          # Next.js middleware (auth)
├── public/                    # Static assets
├── drizzle/                   # Database migrations
├── content/                   # MDX content files
├── docs/                      # Documentation files
├── .env.example               # Example environment variables
├── drizzle.config.ts          # Drizzle ORM configuration
├── tailwind.config.ts         # Tailwind configuration
├── components.json            # Shadcn UI configuration
└── package.json               # Dependencies and scripts
```

## 🔄 Migration from Prisma

This project has been migrated from Prisma to Drizzle ORM. If you're coming from an older version:

- ✅ Prisma schema → Drizzle schema in `src/lib/db/schema.ts`
- ✅ All queries now use Drizzle ORM
- ✅ Removed `@prisma/client` and Supabase dependencies
- ✅ New database commands (see above)

For detailed migration information, see [MIGRATION.md](./MIGRATION.md)

## 🧑‍💻 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled - all code must be fully typed
- **Components**: Use Server Components by default, add `"use client"` only when needed
- **Imports**: Use path aliases (`@/`) for cleaner imports
- **Formatting**: Follow the project's Biome configuration

### Database Operations

```typescript
// Example: Query users
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const users = await db().select().from(user).where(eq(user.email, email));
```

### Form Handling

```typescript
// Example: Form with validation
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests: `npm run build` and `npm run lint`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Contribution Guidelines

- Write clear, descriptive commit messages
- Follow the existing code style and conventions
- Add tests for new features when applicable
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 🐛 Known Issues & Troubleshooting

### Installation Issues

If you encounter peer dependency issues:
```bash
npm install --legacy-peer-deps
```

### Database Connection Issues

- Ensure PostgreSQL is running
- Check your `DATABASE_URL` in `.env.local`
- Verify database credentials and port

### Build Issues

If you get TypeScript errors:
```bash
npm run lint
npm run build
```

## 📚 Resources & Documentation

- **Next.js**: https://nextjs.org/docs
- **Drizzle ORM**: https://orm.drizzle.team/docs
- **BetterAuth**: https://www.better-auth.com/docs
- **Shadcn UI**: https://ui.shadcn.com
- **TailwindCSS**: https://tailwindcss.com/docs
- **React Hook Form**: https://react-hook-form.com
- **Zod**: https://zod.dev
- **TanStack Query**: https://tanstack.com/query

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn UI](https://ui.shadcn.com)
- Unified Authentication Layer - Switchable auth system supporting multiple providers
- Database management with [Drizzle ORM](https://orm.drizzle.team)

## 🤖 ChatGPT Apps SDK Integration

This starter kit now includes full ChatGPT Apps SDK support! You can run your Next.js app as an embedded widget inside ChatGPT using the Model Context Protocol (MCP).

### Quick Start

1. **Deploy your app** to Vercel (or any hosting platform)
2. **Connect to ChatGPT**:
   - Enable Developer Mode in ChatGPT settings
   - Add MCP connector with URL: `https://your-app.vercel.app/mcp`
3. **Test it out** - Try "Show me the content" in ChatGPT

### Features Included

- ✅ MCP server endpoint at `/mcp` for tool registration
- ✅ React hooks for ChatGPT platform integration
- ✅ Iframe compatibility patches for browser APIs
- ✅ CORS support for cross-origin embedding
- ✅ Automatic environment detection (dev/prod)

### Learn More

See [CHATGPT_APPS_SDK.md](./CHATGPT_APPS_SDK.md) for:
- Complete setup guide
- Usage examples
- How to add custom tools
- Troubleshooting tips
- Architecture deep dive

**References:**
- [Vercel's Guide: Running Next.js inside ChatGPT](https://vercel.com/blog/running-next-js-inside-chatgpt-a-deep-dive-into-native-app-integration)
- [ChatGPT Apps SDK Starter](https://github.com/vercel-labs/chatgpt-apps-sdk-nextjs-starter)
- [Model Context Protocol](https://modelcontextprotocol.io)

## 💬 Support

If you have any questions or need help getting started:

- Open an issue on GitHub
- Check existing issues for solutions
- Review the documentation links above

---

**Made with ❤️ by the W3DevStarter team**

Happy coding! 🚀
