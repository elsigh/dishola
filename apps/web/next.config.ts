import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    // viewTransition: true, // Temporarily disabled due to SSR hydration mismatch with server components
    cacheComponents: true,
    clientSegmentCache: true
  },
  //distDir: require("path").join(__dirname, process.env.NODE_ENV === "development" ? ".next/dev" : ".next"),
  transpilePackages: ["@dishola/types", "@dishola/supabase"],
  eslint: {
    ignoreDuringBuilds: true
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sdyqt44cawukbpwe.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**"
      },
      // API domains (development and production)
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "api.dishola.com",
        port: "",
        pathname: "/**"
      },
      // Google Images domains
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        port: "",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn1.gstatic.com",
        port: "",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn2.gstatic.com",
        port: "",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn3.gstatic.com",
        port: "",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**"
      },
      // Unsplash domains
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
        port: "",
        pathname: "/**"
      }
    ]
  }
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // images: {
  //   unoptimized: true,
  // },
}

export default nextConfig
