# Deployment Guide

This monorepo is configured for deployment on Vercel with Turborepo. Each app can be deployed independently.

## Prerequisites

1. Install the Vercel CLI: `npm i -g vercel`
2. Login to Vercel: `vercel login`

## Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Import the Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your GitHub repository

2. **Deploy the Web App**
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js
   - **Build Command**: `cd ../.. && pnpm turbo build --filter=@dishola/web`
   - **Install Command**: `cd ../.. && pnpm install`
   - **Output Directory**: `.next`

3. **Deploy the API**
   - Create a new project for the API
   - **Root Directory**: `apps/api`
   - **Framework Preset**: Other
   - **Build Command**: `cd ../.. && pnpm turbo build --filter=@dishola/api`
   - **Install Command**: `cd ../.. && pnpm install`
   - **Output Directory**: `.output`

### Option 2: Deploy via CLI

```bash
# Deploy web app
cd apps/web
vercel --prod

# Deploy API
cd ../api
vercel --prod
```

## Environment Variables

Make sure to set any required environment variables in the Vercel dashboard for each project:

- **Web App**: Set any frontend-specific environment variables
- **API**: Set any backend-specific environment variables (API keys, database URLs, etc.)

## Custom Domains

After deployment, you can configure custom domains in the Vercel dashboard:

- Web app: `yourdomain.com`
- API: `api.yourdomain.com`

## Turborepo Benefits

- **Incremental Builds**: Only rebuilds what changed
- **Remote Caching**: Shares build cache across team members
- **Parallel Execution**: Builds multiple apps simultaneously
- **Dependency Awareness**: Builds in the correct order

## Monitoring

Both deployments will be available in your Vercel dashboard with:
- Build logs
- Runtime logs
- Performance analytics
- Error tracking 