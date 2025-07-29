import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    cacheComponents: true,
    clientSegmentCache: true
  },
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
