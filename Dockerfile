FROM oven/bun:1 AS base

WORKDIR /app

# Copy root workspace files
COPY package.json bun.lock turbo.json ./
COPY apps/www/package.json ./apps/www/
COPY packages/database/package.json ./packages/database/

# Install dependencies
RUN bun install

# Copy all source files
COPY . .

# Build the app
RUN bun run build

EXPOSE 8801

WORKDIR /app/apps/www
CMD ["bun", "run", "start"]
