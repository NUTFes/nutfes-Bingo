import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        assets: {
          binding: "ASSETS",
          directory: "./test/assets",
        },
        bindings: {
          LOCAL_ADMIN_BYPASS: "true",
          LOCAL_SCREEN_BYPASS: "true",
          LOCAL_TURNSTILE_TEST_MODE: "false",
          RELEASE_SHA: "test-release-sha",
          TURNSTILE_HOSTNAME: "example.com",
          TURNSTILE_SECRET_KEY: "test-turnstile-secret",
        },
      },
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["worker/**/*.test.ts", "test/**/*.test.ts", "test/**/*.test.mjs"],
    testTimeout: 10_000,
  },
});
