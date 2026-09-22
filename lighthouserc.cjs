const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

// chrome-launcher assumes Windows Chrome on WSL, even for Playwright's Linux binary.
// Override its profile flag with a native temporary path and remove it on exit.
const profile = mkdtempSync(join(tmpdir(), "bingo-lighthouse-"));
process.on("exit", () => rmSync(profile, { recursive: true, force: true }));

const chromePath = require("@playwright/test").chromium.executablePath();

module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:8788/", "http://localhost:8788/prizes/"],
      startServerCommand: "pnpm browser:serve",
      startServerReadyPattern:
        "\\[wrangler:info\\] Ready on http://(?:0\\.0\\.0\\.0|localhost):8788",
      startServerReadyTimeout: 300000,
      chromePath,
      numberOfRuns: 3,
      settings: {
        formFactor: "mobile",
        chromeFlags: `--user-data-dir="${profile}"`,
      },
    },
    assert: {
      // Keep Lighthouse's default audit set; avoid presets that add PWA assertions.
      includePassedAssertions: true,
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1, aggregationMethod: "pessimistic" }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "lighthouse-report",
    },
  },
};
