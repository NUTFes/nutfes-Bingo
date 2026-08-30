import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";

const TURNSTILE_ALWAYS_PASS_TEST_SITE_KEY = "1x00000000000000000000AA";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isDevelopmentServer = command === "serve";
  const turnstileSiteKey =
    env.VITE_TURNSTILE_SITE_KEY || (isDevelopmentServer ? TURNSTILE_ALWAYS_PASS_TEST_SITE_KEY : "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      cloudflare({
        config: isDevelopmentServer
          ? (config) => ({
              vars: {
                ...config.vars,
                LOCAL_ADMIN_BYPASS: "true",
                LOCAL_SCREEN_BYPASS: "true",
                LOCAL_TURNSTILE_TEST_MODE: "true",
                TURNSTILE_HOSTNAME: "localhost",
              },
            })
          : undefined,
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      },
    },
    define: {
      "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify(turnstileSiteKey),
    },
    server: {
      host: "127.0.0.1",
      port: 8787,
      strictPort: true,
    },
  };
});
