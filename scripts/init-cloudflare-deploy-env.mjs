#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { access, chmod, readFile, rename, writeFile } from "node:fs/promises";
import process from "node:process";

const args = process.argv.slice(2);
let target;
let force = false;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--env" && args[index + 1]) {
    target = args[index + 1];
    index += 1;
  } else if (argument === "--force") {
    force = true;
  } else {
    throw new Error(
      "Usage: node scripts/init-cloudflare-deploy-env.mjs --env production|staging [--force]",
    );
  }
}
if (!new Set(["production", "staging"]).has(target)) {
  throw new Error("--env must be production or staging");
}

const projectConfig = Object.fromEntries(
  (await readFile("cloudflare.project.env", "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      if (separator <= 0) throw new Error(`Invalid cloudflare.project.env line: ${line}`);
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
const prefix = `CLOUDFLARE_${target.toUpperCase()}_`;
const requiredProjectConfig = [
  `${prefix}ACCOUNT_ID`,
  `${prefix}ACCESS_TEAM_DOMAIN`,
  `${prefix}WORKER`,
  `${prefix}SITE_URL`,
  `${prefix}MEDIA_ORIGIN`,
  `${prefix}ADMIN_AUD`,
  `${prefix}SCREEN_AUD`,
  `${prefix}TURNSTILE_SITE_KEY`,
];
for (const name of requiredProjectConfig) {
  if (!projectConfig[name]) throw new Error(`${name} is required in cloudflare.project.env`);
}
const expected = {
  ACCESS_AUD: projectConfig[`${prefix}ADMIN_AUD`],
  ACCESS_TEAM_DOMAIN: projectConfig[`${prefix}ACCESS_TEAM_DOMAIN`],
  MEDIA_ORIGIN: projectConfig[`${prefix}MEDIA_ORIGIN`],
  SCREEN_ACCESS_AUD: projectConfig[`${prefix}SCREEN_AUD`],
  TURNSTILE_HOSTNAME: new URL(projectConfig[`${prefix}SITE_URL`]).hostname,
};
const workerName = projectConfig[`${prefix}WORKER`];
const outputPath = `.cloudflare.deploy.${target}.env`;
const temporaryPath = `${outputPath}.${process.pid}.tmp`;

if (!force) {
  try {
    await access(outputPath);
    throw new Error(
      `${outputPath} already exists; pass --force only after reviewing the active Worker`,
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

execFileSync("./scripts/check-cloudflare-operator.sh", ["--env", target], {
  stdio: "inherit",
});
const wranglerJson = (...wranglerArgs) =>
  JSON.parse(
    execFileSync(
      "./scripts/cloudflare-wrangler.sh",
      ["--target", target, ...wranglerArgs, "--json"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      },
    ),
  );
const environmentArgs = target === "staging" ? ["--env", "staging"] : ["--env="];
const deployments = wranglerJson("deployments", "list", ...environmentArgs);
const latest = deployments
  .filter((deployment) => typeof deployment?.created_on === "string")
  .toSorted((left, right) => Date.parse(left.created_on) - Date.parse(right.created_on))
  .at(-1);
const activeVersions = Array.isArray(latest?.versions)
  ? latest.versions.filter((version) => version?.percentage === 100)
  : [];
if (activeVersions.length !== 1 || typeof activeVersions[0].version_id !== "string") {
  throw new Error(`Could not determine the active ${target} Worker version`);
}
const workerVersionId = activeVersions[0].version_id;
const version = wranglerJson("versions", "view", workerVersionId, "--name", workerName);
const bindings = new Map(
  version.resources?.bindings
    ?.filter((binding) => binding?.type === "plain_text" && typeof binding.text === "string")
    .map((binding) => [binding.name, binding.text]) ?? [],
);
for (const [name, value] of Object.entries(expected)) {
  if (bindings.get(name) !== value) {
    throw new Error(
      `Active ${target} binding ${name} differs from the reviewed value in cloudflare.project.env`,
    );
  }
}
for (const name of ["ADMIN_EMAILS", "SCREEN_EMAILS"]) {
  const value = JSON.parse(bindings.get(name) ?? "null");
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Active ${target} binding ${name} is empty or invalid`);
  }
}

const shellQuote = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;
const output = [
  `# Generated from active ${target} Worker version ${workerVersionId}.`,
  "# Review the allowlists, keep mode 600, and never commit this file.",
  `ACCESS_TEAM_DOMAIN=${shellQuote(expected.ACCESS_TEAM_DOMAIN)}`,
  `ACCESS_AUD=${shellQuote(expected.ACCESS_AUD)}`,
  `ADMIN_EMAILS=${shellQuote(bindings.get("ADMIN_EMAILS"))}`,
  `SCREEN_ACCESS_AUD=${shellQuote(expected.SCREEN_ACCESS_AUD)}`,
  `SCREEN_EMAILS=${shellQuote(bindings.get("SCREEN_EMAILS"))}`,
  `MEDIA_ORIGIN=${shellQuote(expected.MEDIA_ORIGIN)}`,
  `NEXT_PUBLIC_SITE_URL=${shellQuote(projectConfig[`${prefix}SITE_URL`])}`,
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${shellQuote(projectConfig[`${prefix}TURNSTILE_SITE_KEY`])}`,
  `STAMP_DAILY_LIMIT=${shellQuote(bindings.get("STAMP_DAILY_LIMIT") ?? "25000")}`,
  "",
].join("\n");
await writeFile(temporaryPath, output, { encoding: "utf8", mode: 0o600, flag: "wx" });
await chmod(temporaryPath, 0o600);
await rename(temporaryPath, outputPath);
console.log(
  `Wrote ${outputPath} from active Worker version ${workerVersionId}; values were not printed.`,
);
