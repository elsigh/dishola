import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Help Turbopack resolve modules in monorepo
  turbopack: {
    resolveAlias: {
      // Ensure proper resolution in monorepo
      "next": "next",
    },
  },
  // Ensure proper transpilation of workspace packages
  transpilePackages: [],
};

export default nextConfig;
