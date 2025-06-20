//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  compatibilityDate: "2025-01-20",
  experimental: {
    openAPI: true
  },
  openAPI: {
    meta: {
      title: "Dishola API",
      description: "API for searching dishes at restaurants using Toast menu data",
      version: "1.0.0"
    }
  }
});
