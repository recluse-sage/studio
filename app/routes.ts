import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  // Honest placeholder only. No grid, no examples, no proof. Out of sitemap with noindex.
  route("work", "routes/work.tsx"),
  // Blog and know-how library. Client fed by GET /api/public/posts when present.
  // Honest empty states until posts exist. Out of sitemap until content is live.
  route("blog", "routes/blog.tsx"),
  route("blog/:slug", "routes/blog-article.tsx"),
  route("posts/:slug", "routes/post-article.tsx"),
  route("know-how", "routes/know-how.tsx"),
  route("know-how/:slug", "routes/know-how-article.tsx"),
  // Private owner admin. Client rendered, never prerendered, never in sitemap.
  // Worker gates this path with Cloudflare Access before serving the shell.
  // Phase 1 parallel registry on the new stack. Listed before admin/* because
  // the splat would otherwise swallow /admin/registry. Worker run_worker_first
  // already covers /admin/*, so this path inherits the same Access gate.
  route("admin/registry", "routes/admin-registry.tsx"),
  route("admin/*", "routes/admin.tsx"),
  // Catch all 404. Last so /, /work, and /admin/* keep their boundaries.
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
