/// <reference types="vite/client" />

declare module "*.css";
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
}
