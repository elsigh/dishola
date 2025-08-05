//https://nitro.unjs.io/config
import { defineNitroConfig } from "nitropack/config"

export default defineNitroConfig({
  imports: false,
  srcDir: "server",
  compatibilityDate: "2025-01-20",
  experimental: {
    openAPI: true
  },
  alias: {
    "@dishola/types": "../../packages/types/index.ts",
    "@dishola/types/constants": "../../packages/types/constants.ts"
  },
  openAPI: {
    meta: {
      title: "Dishola API",
      description: "API for searching dishes at restaurants using Toast menu data",
      version: "1.0.0"
    }
  }
})
