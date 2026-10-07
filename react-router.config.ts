import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  future: { v8_viteEnvironmentApi: true },
  // Public only. Admin stays server rendered behind Access and is never prerendered.
  prerender: ["/"],
} satisfies Config;
