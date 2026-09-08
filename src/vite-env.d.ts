/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL: string;
  readonly VITE_MEDIA_ORIGIN: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_IMAGE_TRANSFORMATIONS: "true" | "false";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
