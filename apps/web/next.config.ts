import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    ppr: true,
    devtoolNewPanelUI: true,
    devtoolSegmentExplorer: true,
    clientSegmentCache: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // images: {
  //   unoptimized: true,
  // },
}

export default nextConfig
