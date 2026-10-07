import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

// Single build-time source for the public canonical origin.
// PUBLIC_SITE_URL is a public Build variable (Cloudflare Workers Builds dashboard
// for deploys, shell env for local builds), not a secret and not a runtime var.
// VITE_PUBLIC_SITE_URL is derived here so prerendered canonical tags always match
// the sitemap generated from the same value in scripts/generate-sitemap.mjs.
// Empty stays empty: canonical and sitemap output stay withheld until configured.
// Change the URL in Workers Builds, then rebuild/redeploy. Example:
// https://oasis-dev.oasishub.workers.dev
function resolvePublicSiteUrl(): string {
  const raw = (process.env.PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return "";
    if (["localhost", "127.0.0.1", "example.com", "example.org"].includes(url.hostname)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

const publicSiteUrl = resolvePublicSiteUrl();
// Derive for Vite/React Router. Do not set VITE_PUBLIC_SITE_URL manually.
process.env.VITE_PUBLIC_SITE_URL = publicSiteUrl;

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    reactRouter(),
    tsconfigPaths(),
  ],
});
