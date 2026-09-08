import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";

import { siteHtml } from "./config/site-html.ts";
import { SITE_PAGES } from "./src/site-pages.ts";

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const TURNSTILE_TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";

function validatedSiteUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VITE_SITE_URL must be an absolute HTTP(S) URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("VITE_SITE_URL must use HTTP or HTTPS");
  }
  return url.toString().replace(/\/$/, "");
}

function validatedMediaOrigin(value: string) {
  if (!value) return "";
  const url = new URL(value);
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("VITE_MEDIA_ORIGIN must be an HTTPS origin");
  }
  return url.origin;
}

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const isBuild = command === "build";
  const siteUrl = validatedSiteUrl(env.VITE_SITE_URL || "http://localhost:8787");
  const mediaOrigin = validatedMediaOrigin(env.VITE_MEDIA_ORIGIN || "");
  const turnstileSiteKey = env.VITE_TURNSTILE_SITE_KEY || (isBuild ? "" : TURNSTILE_TEST_SITE_KEY);
  const imageTransformations = env.VITE_IMAGE_TRANSFORMATIONS || (isBuild ? "true" : "false");
  if (isBuild && !turnstileSiteKey) {
    throw new Error("VITE_TURNSTILE_SITE_KEY is required for production builds");
  }
  if (imageTransformations !== "true" && imageTransformations !== "false") {
    throw new Error('VITE_IMAGE_TRANSFORMATIONS must be "true" or "false"');
  }

  const localDev = command === "serve" && !isPreview && process.env.BINGO_LOCAL_DEV === "true";
  const usePolling = process.env.VITE_USE_POLLING === "true";
  const htmlInputs = [
    ...SITE_PAGES.map(({ html }) => resolve(import.meta.dirname, html)),
    resolve(import.meta.dirname, "404.html"),
  ];

  return {
    appType: "mpa",
    base: "/",
    resolve: { alias: { "@": resolve(import.meta.dirname, "src") } },
    plugins: [
      react(),
      siteHtml({ siteUrl }),
      cloudflare({
        configPath: "./wrangler.jsonc",
        viteEnvironment: { name: "worker" },
        persistState: { path: ".wrangler/vite-state" },
        remoteBindings: false,
        tunnel: { autoStart: false },
        config: localDev
          ? (config) => ({
              vars: {
                ...config.vars,
                LOCAL_ADMIN_BYPASS: "true",
                LOCAL_SCREEN_BYPASS: "true",
                LOCAL_TURNSTILE_TEST_MODE: "true",
                TURNSTILE_HOSTNAME: "localhost",
                TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY,
              },
            })
          : undefined,
      }),
    ],
    environments: {
      client: {
        define: {
          "import.meta.env.VITE_SITE_URL": JSON.stringify(siteUrl),
          "import.meta.env.VITE_MEDIA_ORIGIN": JSON.stringify(mediaOrigin),
          "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify(turnstileSiteKey),
          "import.meta.env.VITE_IMAGE_TRANSFORMATIONS": JSON.stringify(imageTransformations),
        },
        build: {
          outDir: "dist/client",
          rolldownOptions: { input: htmlInputs },
        },
      },
      worker: {
        build: {
          outDir: "dist/worker",
          minify: true,
        },
      },
    },
    server: {
      host: "0.0.0.0",
      port: 8787,
      strictPort: true,
      watch: usePolling ? { usePolling: true, interval: 100 } : undefined,
    },
  };
});
