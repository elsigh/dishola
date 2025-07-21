# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dishola is a modern food-discovery platform that focuses on dishes rather than restaurants. Built as a Turborepo monorepo with a Next.js frontend and Nitro backend API, using Supabase as the database and authentication provider.

## Architecture

### Monorepo Structure
- **Framework**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 15 with React 19 (`apps/web`)
- **Backend**: Nitro API server (`apps/api`)
- **Shared**: Supabase client utilities (`packages/supabase`)

### Tech Stack
- **Frontend**: Next.js 15 with Turbo, Tailwind CSS, Radix UI, shadcn/ui
- **Backend**: Nitro (UnJS), Vercel AI SDK 5, Supabase admin client
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with OAuth providers
- **AI Integration**: Vercel AI Gateway for dish search
- **Code Quality**: Biome for formatting/linting

## Development Commands

```bash
# Install dependencies
pnpm install

# Start all development servers
pnpm dev

# Build all applications
pnpm build

# Lint all applications
pnpm lint

# Format code with Biome
pnpm format

# Clean all build outputs
pnpm clean
```

### App-specific Commands

```bash
# Web app (Next.js) - runs on http://localhost:3000
pnpm --filter @dishola/web dev
pnpm --filter @dishola/web build
pnpm --filter @dishola/web start

# API server (Nitro) - runs on http://localhost:3001
pnpm --filter @dishola/api dev
pnpm --filter @dishola/api build
pnpm --filter @dishola/api preview
```

## Key Architecture Patterns

### Database Schema
Core entities: Users, Restaurants, Dishes, Reviews
- Auto-updating timestamps and calculated ratings via triggers
- Row Level Security policies for data access
- Proper indexing for search performance

### Authentication Flow
- Supabase Auth context provider in `apps/web/lib/auth-context.tsx`
- OAuth providers configuration
- Protected routes and server-side auth validation

### Search Architecture
- AI-powered dish search using structured prompts
- Dual results: AI recommendations + community database
- Location-based filtering with IP geolocation fallback
- Image sourcing from Google Images/Unsplash APIs

### Component Architecture
- shadcn/ui components in `apps/web/components/ui/`
- Feature-specific components in `apps/web/components/[feature]/`
- Shared utilities in `apps/web/lib/`

## Environment Configuration

### Required Variables
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **AI Service**: `AI_PROVIDER=gateway`, `AI_GATEWAY_MODEL`
- **Image APIs**: `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_ENGINE_ID`, `UNSPLASH_ACCESS_KEY`
- **Authentication**: OAuth provider keys for Google, GitHub, etc.

### AI Model Configuration
- Uses Vercel AI Gateway by default
- Model switching via Vercel Edge Config
- Fallback to direct provider APIs if needed

## Code Style and Standards

### Biome Configuration
- 2-space indentation, 120 character line width
- Trailing commas: none, semicolons: as needed
- Import organization enabled
- Unused imports/variables as warnings

### File Naming Conventions
- kebab-case for file names
- Components use PascalCase
- API routes in `server/routes/api/`
- Pages in `app/` directory (App Router)

## Database Development

### Schema Location
- Complete schema in `/db/schema.sql`
- Migration files in `/db/migrations/`
- Use Supabase CLI for schema changes

### Common Patterns
- Row Level Security policies for data access
- Triggers for calculated fields and timestamps
- Proper indexing for search queries

## Testing

**Current State**: No formal testing framework configured
**Recommendations**: Add Vitest for unit testing, Playwright for E2E

## Deployment

### Platform
- **Vercel** for both frontend and API
- Each app deployed independently
- Uses Turborepo for incremental builds

### Build Configuration
- Web app: Next.js preset with Turbo
- API: Nitro framework with automatic adapter detection
- Remote caching enabled in Turbo

## Key Files for Development

### Configuration
- `/turbo.json` - Turborepo build configuration
- `/biome.json` - Code formatting and linting rules
- `/apps/web/next.config.ts` - Next.js configuration
- `/apps/api/nitro.config.ts` - Nitro server configuration

### Core Implementation
- `/apps/web/app/layout.tsx` - Root layout with theme and auth providers
- `/apps/web/lib/auth-context.tsx` - Authentication state management
- `/apps/api/server/routes/api/search.ts` - Main search API endpoint
- `/packages/supabase/` - Shared database client utilities

### Important Notes
- Use `next dev --turbo` for faster development builds
- API server runs on port 3001 to avoid conflicts
- Supabase admin client used in API for privileged operations
- Image uploads use Vercel Blob storage
- Search results combine AI and community data sources