import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

const assetsDirectory = existsSync("./out/index.html") ? "./out" : "./test/assets";

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        assets: {
          binding: "ASSETS",
          directory: assetsDirectory,
        },
        bindings: {
          LOCAL_ADMIN_BYPASS: "true",
          LOCAL_SCREEN_BYPASS: "true",
          LOCAL_TURNSTILE_TEST_MODE: "false",
          TURNSTILE_HOSTNAME: "example.com",
          TURNSTILE_SECRET_KEY: "test-turnstile-secret",
        },
      },
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["worker/**/*.test.ts", "test/**/*.test.ts"],
    testTimeout: 10_000,
  },
});
