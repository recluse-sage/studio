import { defineConfig } from "vitest/config";

// Server unit tests only. Node environment, no Cloudflare Vite plugin,
// no React Router plugin, and no workerd. Keeps macOS 12.6 runs local.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/server/**/*.test.ts"],
  },
});
