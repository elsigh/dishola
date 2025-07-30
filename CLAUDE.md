# IMPORTANT: API URL Usage

**NEVER hardcode API URLs** (e.g., `http://localhost:3001`, `https://api.dishola.com`) in the web app. **ALWAYS use the `API_BASE_URL` constant** from `@/lib/constants` for any fetch to the Nitro server. This ensures correct behavior in all environments (development, preview, production).

Example:
```ts
import { API_BASE_URL } from "@/lib/constants"
const response = await fetch(`${API_BASE_URL}/api/endpoint`)
```

# IMPORTANT: Shared Types Usage

**ALWAYS use shared types** from `@dishola/types` for all API interactions. **NEVER define inline types** for API requests/responses - use the shared schemas to ensure type consistency between frontend and backend.

Examples:
```ts
// Import types for TypeScript
import type { ProfileResponse, UserTastesResponse, DishDetailResponse } from "@dishola/types"

// Import schemas for runtime validation
import { ProfileResponseSchema, UserTasteRequestSchema } from "@dishola/types"

// Use types for function parameters and return values
const getProfile = async (): Promise<ProfileResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/profile`)
  const data = await response.json()
  
  // Use Zod schema for runtime validation when needed
  return ProfileResponseSchema.parse(data)
}

// Use request types for API calls
const updateUserTastes = async (request: UserTasteRequest) => {
  // Validate request data
  const validatedRequest = UserTasteRequestSchema.parse(request)
  // ... make API call
}
```

**Available Type Categories:**
- **Database Table Types**: `User`, `Restaurant`, `Dish`, `Review`, `Profile`, `TasteDictionary`, `UserTaste`, `DishImage`
- **API Response Types**: `ProfileResponse`, `PublicProfileResponse`, `DishDetailResponse`, `UserTastesResponse`, etc.
- **API Request Types**: `ProfileUpdateRequest`, `UserTasteRequest`, `CreateTasteRequest`, etc.
- **Search & AI Types**: `ParsedQuery`, `Location`, `DishRecommendation`, `ImageResult`

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dishola is a modern food-discovery platform that focuses on dishes rather than restaurants. Built as a Turborepo monorepo with a Next.js frontend and Nitro backend API, using Supabase as the database and authentication provider.

## Architecture

### Monorepo Structure
- **Framework**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 15 with React 19 (`apps/web`)
- **Backend**: Nitro API server (`apps/api`)
- **Shared**: Supabase client utilities (`packages/supabase`), Shared types (`packages/types`)

### Data Flow Architecture
**CRITICAL**: The web app (`apps/web`) NEVER contains API routes for data operations. All data flows through this pattern:
- Web App UI → HTTP requests → Nitro API (`localhost:3001`) → Supabase Database
- Web App only uses Supabase for authentication (session tokens), never for direct data queries
- All business logic, data queries, and external API calls happen in the Nitro backend
- Web App API routes (`apps/web/app/api/`) should only exist for Next.js-specific functions like file uploads, never for data CRUD operations

### Tech Stack
- **Frontend**: Next.js 15 with Turbo, Tailwind CSS, Radix UI, shadcn/ui
- **Backend**: Nitro (UnJS), Vercel AI SDK 5, Supabase admin client
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with OAuth providers
- **AI Integration**: Vercel AI Gateway for dish search
- **Code Quality**: Biome for formatting/linting
- **Type Safety**: Shared types package (`@dishola/types`) with Zod schemas

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

### Service Boundaries (CRITICAL)
**Frontend (`apps/web`) Rules:**
- ALL external service calls MUST go through the Nitro backend (`apps/api`)
- NO direct fetch calls to third-party APIs (Google, Unsplash, OpenAI, etc.)
- NO service-specific environment variables (API keys, tokens) in web app
- Use `/api/*` routes to proxy all external service interactions
- The Nitro backend is the ONLY gateway to external services

**Backend (`apps/api`) Rules:**
- NO UI components or pages - API endpoints only
- Handle ALL external service integrations and API key management
- Provide clean REST/GraphQL interfaces for frontend consumption
- Contains ALL service-specific environment variables

**Admin/GUI Requirements:**
- Admin interfaces belong in `apps/web` with dedicated routes
- Admin functionality calls Nitro backend endpoints for service interactions
- NO admin UI in `apps/api` - keep it pure API

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
- Image sourcing from Google Images/Unsplash APIs (via Nitro backend)

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

### Shared Types (CRITICAL)
- **ALWAYS use shared types** from `@dishola/types` for all API interactions
- **NEVER define inline types** for API requests/responses - use the shared schemas
- All database table types, API request/response types are defined in `@dishola/types`
- Use Zod schemas for runtime validation when parsing external data
- Import types: `import type { ProfileResponse } from "@dishola/types"`
- Import schemas: `import { ProfileResponseSchema } from "@dishola/types"`

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

### Data and Service Policy
**CRITICAL**: This application does NOT use any mock data, mock services, fake data, placeholder data, or dummy data anywhere. All components, APIs, and features must use real production data and services from the start. When implementing new features:
- Connect directly to real Supabase database
- Use actual API endpoints, never mock APIs
- Implement real authentication flows, never fake auth
- Use real image sources and external services
- If data doesn't exist yet, create the real data structures and populate them
- Never use hardcoded arrays, sample data, or temporary placeholders

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
**Policy**: When testing is implemented, all tests must use real data and services following the no-mock policy. Tests should use dedicated test databases with real data structures, not mocked responses or fake data.
**Recommendations**: Add Vitest for unit testing with real database connections, Playwright for E2E testing against actual deployed environments

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