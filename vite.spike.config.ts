import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

// TEMPORARY spike 1 only. Same as vite.config.ts minus the Cloudflare plugin,
// because workerd/miniflare refuses macOS 12 (needs 13.5+). Lets plain Vite serve
// the app for local browser verification. No Workers runtime here, so /api/*
// calls fail gracefully in the client as designed. DELETE before merging.
export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
});
