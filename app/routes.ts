import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Honest placeholder only. No grid, no examples, no proof. Out of sitemap with noindex.
  route("work", "routes/work.tsx"),
  // Private owner admin. Client rendered, never prerendered, never in sitemap.
  // Worker gates this path with Cloudflare Access before serving the shell.
  route("admin/*", "routes/admin.tsx"),
  // Catch all 404. Last so /, /work, and /admin/* keep their boundaries.
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
