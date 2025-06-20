# Dishola

A modern monorepo built with Turborepo containing a Next.js frontend and Nitro backend.

## Structure

This is a [Turborepo](https://turbo.build/repo) monorepo with the following apps:

- `apps/web`: Next.js frontend application
- `apps/api`: Nitro backend API

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended package manager)

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers for all apps
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint

# Clean all build outputs
pnpm clean
```

### Individual App Commands

You can also run commands for specific apps:

```bash
# Run dev server for web app only
pnpm --filter @dishola/web dev

# Build API only
pnpm --filter @dishola/api build

# Lint web app only
pnpm --filter @dishola/web lint
```

## Deployment

This monorepo is configured for deployment on Vercel with each app deployed independently:

- **Web App**: Deploy from `apps/web` directory
- **API**: Deploy from `apps/api` directory

Each app has its own `vercel.json` configuration that uses Turborepo for building.

## Development

- The web app runs on `http://localhost:3000`
- The API runs on `http://localhost:3001`

## Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Nitro Documentation](https://nitro.unjs.io/)