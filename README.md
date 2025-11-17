# NextJS 16 Starter Kit

A modern, production-ready Next.js 16 starter template for building full-stack web applications with authentication, database integration, and a comprehensive UI component library.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38bdf8)](https://tailwindcss.com/)

## ✨ Features

- 🚀 **Next.js 16** with App Router for optimal performance
- 🔐 **Authentication** powered by Clerk - Sign up, sign in, and user management
- 💾 **Database** with PostgreSQL and Drizzle ORM for type-safe queries
- 🎨 **Beautiful UI** with Shadcn UI, TailwindCSS, and multiple component libraries
- 📝 **Forms** with React Hook Form and Zod validation
- 🔄 **State Management** using TanStack Query for server state
- ⚡ **Rate Limiting & Caching** with Redis/Upstash
- 💳 **Payment Integration** with Stripe (optional)
- 🐳 **Docker Support** for easy local development
- 📊 **Database Studio** with Drizzle Studio for visual database management

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 with App Router |
| Language | TypeScript (strict mode) |
| Styling | TailwindCSS |
| UI Components | Shadcn UI, Radix UI, Tremor, Magic UI |
| Authentication | Clerk |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Forms | React Hook Form + Zod |
| State Management | TanStack Query (React Query) |
| Caching | Redis (Upstash) |
| Payments | Stripe (optional) |
| Icons | Lucide React, Tabler Icons |
| Animations | Framer Motion |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or remote)
- Clerk account for authentication ([sign up here](https://clerk.com))

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
   Edit `.env.local` and add your Clerk credentials (see [Environment Variables](#-environment-variables) section)

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

1. Make changes to `lib/db/schema.ts`
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

### Required - Clerk Authentication

Sign up at [Clerk.com](https://clerk.com) to get these credentials:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
WEBHOOK_SECRET=whsec_...
```

### Required - Database

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/nextjs_starter
```

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
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (marketing)/       # Public marketing pages
│   ├── api/               # API routes and webhooks
│   ├── dashboard/         # Protected dashboard routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── form/             # Form components
│   ├── LandingPage/      # Landing page sections
│   └── NavBar.tsx        # Navigation component
├── lib/                   # Core utilities
│   ├── db/               # Database config and schema
│   └── utils.ts          # Helper functions
├── utils/                 # Utility functions
├── public/                # Static assets
├── .env.example           # Example environment variables
├── drizzle.config.ts      # Drizzle ORM configuration
├── middleware.ts          # Next.js middleware (auth)
└── tailwind.config.ts     # Tailwind configuration
```

## 🔄 Migration from Prisma

This project has been migrated from Prisma to Drizzle ORM. If you're coming from an older version:

- ✅ Prisma schema → Drizzle schema in `lib/db/schema.ts`
- ✅ All queries now use Drizzle ORM
- ✅ Removed `@prisma/client` and Supabase dependencies
- ✅ New database commands (see above)

For detailed migration information, see [MIGRATION.md](./MIGRATION.md)

## 🧑‍💻 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled - all code must be fully typed
- **Components**: Use Server Components by default, add `"use client"` only when needed
- **Imports**: Use path aliases (`@/`) for cleaner imports
- **Formatting**: Follow the project's ESLint configuration

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
- **Clerk Auth**: https://clerk.com/docs
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
- Authentication by [Clerk](https://clerk.com)
- Database management with [Drizzle ORM](https://orm.drizzle.team)

## 💬 Support

If you have any questions or need help getting started:

- Open an issue on GitHub
- Check existing issues for solutions
- Review the documentation links above

---

**Made with ❤️ by the W3DevStarter team**

Happy coding! 🚀
