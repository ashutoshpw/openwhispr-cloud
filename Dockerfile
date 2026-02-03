FROM oven/bun:1 AS base

WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock turbo.json ./
COPY apps/next-app/package.json ./apps/next-app/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN bun install

# Copy all source files
COPY . .

# Build the app
RUN bun run build

EXPOSE 8801

WORKDIR /app/apps/next-app
CMD ["bun", "run", "start"]
