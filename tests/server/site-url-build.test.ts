import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

// Contract for the single public site URL build source.
// PUBLIC_SITE_URL is the one build-time value. VITE_PUBLIC_SITE_URL is derived
// in vite.config.ts. Robots Sitemap line comes from the same value on each build.
// Revision 2026-10: sitemap moved from a build-time static file to a runtime
// Worker response at GET /sitemap.xml with published posts included. The build
// script now only syncs the robots Sitemap line and removes any old static
// file. The Worker derives the origin from the request URL with an https and
// hostname guard, serves max-age 300, and runs worker-first via wrangler.
describe("site url build source", () => {
  it("build syncs robots before prerendering", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const build = pkg.scripts.build ?? "";
    expect(build).toContain("scripts/generate-sitemap.mjs");
    expect(build).toContain("react-router build");
    expect(build.indexOf("generate-sitemap")).toBeLessThan(build.indexOf("react-router build"));
  });

  it("vite derives VITE_PUBLIC_SITE_URL from PUBLIC_SITE_URL", () => {
    const config = read("vite.config.ts");
    expect(config).toContain("process.env.PUBLIC_SITE_URL");
    expect(config).toContain("process.env.VITE_PUBLIC_SITE_URL");
  });

  it("has no independent manual VITE_PUBLIC_SITE_URL value", () => {
    const envExample = read(".env.example");
    const assignments = envExample
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("VITE_PUBLIC_SITE_URL="));
    expect(assignments).toEqual([]);
  });

  it("keeps no runtime PUBLIC_SITE_URL duplicate", () => {
    const wrangler = read("wrangler.jsonc");
    expect(wrangler).not.toContain('"PUBLIC_SITE_URL"');
    const worker = read("workers/app.ts");
    expect(worker).not.toContain("PUBLIC_SITE_URL?:");
    expect(worker).not.toMatch(/env\.PUBLIC_SITE_URL/);
    const devVars = read(".dev.vars.example");
    const runtimeAssignments = devVars
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("PUBLIC_SITE_URL="));
    expect(runtimeAssignments).toEqual([]);
  });

  it("keeps / prerendered and asset-first, with sitemap worker-first", () => {
    const rrConfig = read("react-router.config.ts");
    expect(rrConfig).toContain('"/"');
    const wrangler = read("wrangler.jsonc");
    expect(wrangler).toContain("run_worker_first");
    // "/" and "/assets/*" stay asset-first, so the worker-first list must not
    // route them through the Worker. Check the list value, not comments.
    const match = wrangler.match(/"run_worker_first"\s*:\s*\[(.*?)\]/s);
    expect(match).not.toBeNull();
    const list = match?.[1] ?? "";
    expect(list).toContain("/api/*");
    expect(list).toContain("/sitemap.xml");
    expect(list).not.toContain('"/"');
    expect(list).not.toContain("/assets/*");
  });

  it("sitemap script withholds output when the build value is empty", () => {
    const script = read("scripts/generate-sitemap.mjs");
    expect(script).toContain("process.env.PUBLIC_SITE_URL");
    expect(script).toContain("SKIP: PUBLIC_SITE_URL is empty");
  });

  it("sitemap script no longer emits a static file", () => {
    const script = read("scripts/generate-sitemap.mjs");
    expect(script).toContain("runtime sitemap");
    expect(script).toContain("removeGeneratedSitemap");
    expect(script).not.toContain("writeFileSync(sitemapPath");
  });

  it("worker serves runtime sitemap plus hourly cron", () => {
    const worker = read("workers/app.ts");
    expect(worker).toContain("/sitemap.xml");
    expect(worker).toContain("handleSitemap");
    expect(worker).toContain("scheduled");
    expect(worker).toContain("runScheduledPublish");
    const wrangler = read("wrangler.jsonc");
    expect(wrangler).toContain('"crons": ["7 * * * *"]');
  });
});
