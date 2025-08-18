import { URL, fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    setupFiles: "./vitest-setup.ts",
  },
  resolve: {
    alias: [
      {
        find: "@/",
        replacement: fileURLToPath(new URL("./", import.meta.url)),
      },
    ],
  },
});
