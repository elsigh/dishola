# Dishola.com

A food-discovery platform that focuses on dishes rather than restaurants. Built as a Turborepo monorepo with a Next.js frontend and Nitro backend API, using Supabase as the database and authentication provider.

## History

Dishola was originally developed as a startup in Austin, TX in 2006 by Lindsey Simon, Meredith Maycotte and Laura Kelso to be a community and industry user-generated-review site. 

In 2025, I (Lindsey) am going to bring it back - as a modern webapp that leverages AI for search and discovery. It's also a fun vibe+hand-coding learning experience for me.

## Features

- 🍽️ **Dish-focused search** - Find specific dishes, not just restaurants
- 🤖 **AI-powered recommendations** - Smart dish suggestions based on your preferences  
- 📍 **Location-based discovery** - Find dishes near you with precise location controls
- 👤 **User profiles & tastes** - Personalized recommendations based on your preferences
- 📱 **Modern responsive UI** - Built with Next.js 15, React 19, and Tailwind CSS
- 🔐 **Authentication** - OAuth login with Google, GitHub, and more via Supabase
- 🗺️ **Interactive maps** - Google Maps integration with custom location picker
- 📸 **Dish images** - AI-powered image sourcing from Google Images and Unsplash

## Structure

This is a [Turborepo](https://turbo.build/repo) monorepo with the following structure:

### Apps
- `apps/web`: Next.js 15 frontend with React 19, Tailwind CSS, and Radix UI
- `apps/api`: Nitro backend API with Vercel AI SDK integration

### Packages  
- `packages/types`: Shared TypeScript types and Zod schemas
- `packages/supabase`: Supabase client utilities for browser, server, and admin

## Tech Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 15 with Turbopack
- **UI**: React 19, Tailwind CSS, Radix UI, shadcn/ui
- **Maps**: Google Maps JavaScript API with custom location picker
- **Authentication**: Supabase Auth with OAuth providers
- **State Management**: React hooks and URL parameters
- **Image Handling**: Next.js Image component with optimization

### Backend (`apps/api`)
- **Framework**: Nitro (UnJS)
- **AI**: Vercel AI SDK 5 with AI Gateway
- **Database**: Supabase PostgreSQL with Row Level Security
- **External APIs**: Google Images, Unsplash, OpenStreetMap Nominatim
- **Deployment**: Vercel with automatic adapter detection

### Database & Auth
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with OAuth (Google, GitHub, etc.)
- **Security**: Row Level Security policies
- **Real-time**: Supabase real-time subscriptions

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended package manager)
- Supabase account for database and auth
- Google Maps API key for location features
- Vercel account for AI Gateway (optional, but recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dishola.git
cd dishola

# Install dependencies
pnpm install

# Set up environment variables (see Environment Setup below)
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Start development servers for all apps
pnpm dev

# Build all apps
pnpm build

# Lint all apps  
pnpm lint

# Clean all build outputs
pnpm clean
```

### Environment Setup

#### Web App (`apps/web/.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Optional: Analytics
VERCEL_ANALYTICS_ID=your_analytics_id
```

#### API (`apps/api/.env`)  
```bash
# Supabase
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# AI Configuration
AI_PROVIDER=gateway
AI_GATEWAY_MODEL=openai/gpt-3.5-turbo

# Image APIs
GOOGLE_CSE_API_KEY=your_google_cse_key
GOOGLE_CSE_ENGINE_ID=your_cse_engine_id
UNSPLASH_ACCESS_KEY=your_unsplash_key
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

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Create two projects - one for web app, one for API
3. Set the root directory for each project to the respective app folder
4. Configure environment variables in Vercel dashboard
5. Deploy!

## Development

- The web app runs on `http://localhost:3000`
- The API runs on `http://localhost:3001`
- All services run concurrently with `pnpm dev`

## Architecture Principles

### Data Flow
- **Web App** → HTTP requests → **Nitro API** → **Supabase Database**
- Web app never directly queries database (except for auth)
- All business logic and external API calls happen in Nitro backend
- Shared types ensure consistency between frontend and backend

### Key Patterns
- **No Mock Data**: Uses real production data and services from the start
- **Shared Types**: `@dishola/types` package ensures type safety across apps
- **API-First**: Web app only uses Supabase for auth, all data via Nitro API
- **Location-Centric**: GPS and location data drive the core user experience

## Contributing

We welcome contributions! This project is open source under the MIT License.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Run the linter: `pnpm lint`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style
- Uses Biome for formatting and linting
- 2-space indentation, 120 character line width
- Favor descriptive component and function names over comments
- Use shared types from `@dishola/types` for all API interactions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Learn More

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Nitro Documentation](https://nitro.unjs.io/)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)