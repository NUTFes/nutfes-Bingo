import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
  const isDevelopmentServer = command === "serve";

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
    server: {
      host: "127.0.0.1",
      port: 8787,
      strictPort: true,
    },
  };
});
