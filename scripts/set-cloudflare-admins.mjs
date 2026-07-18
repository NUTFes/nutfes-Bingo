#!/usr/bin/env node

import { createHash } from "node:crypto";
import { chmod, readFile, rename, stat, writeFile } from "node:fs/promises";
import process from "node:process";

const args = process.argv.slice(2);
let target;
let rosterPath;
let deployEnvPath;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--env" && args[index + 1]) {
    target = args[index + 1];
    index += 1;
  } else if (argument === "--roster" && args[index + 1]) {
    rosterPath = args[index + 1];
    index += 1;
  } else if (argument === "--deploy-env" && args[index + 1]) {
    deployEnvPath = args[index + 1];
    index += 1;
  } else {
    throw new Error(
      "Usage: node scripts/set-cloudflare-admins.mjs --env production|staging --roster path [--deploy-env path]",
    );
  }
}
if (!new Set(["production", "staging"]).has(target)) {
  throw new Error("--env must be production or staging");
}
if (!rosterPath) throw new Error("--roster is required");
deployEnvPath ??= `.cloudflare.deploy.${target}.env`;

const assertPrivateFile = async (path, label) => {
  const metadata = await stat(path);
  if (!metadata.isFile()) throw new Error(`${label} must be a regular file: ${path}`);
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error(`${label} must have mode 600 or stricter: ${path}`);
  }
};
await assertPrivateFile(rosterPath, "Roster");
await assertPrivateFile(deployEnvPath, "Deploy environment");

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

const roster = JSON.parse(await readFile(rosterPath, "utf8"));
const expectedKeys = ["administrators"];
if (
  roster === null ||
  typeof roster !== "object" ||
  Array.isArray(roster) ||
  Object.keys(roster).toSorted().join("\n") !== expectedKeys.toSorted().join("\n") ||
  !Array.isArray(roster.administrators)
) {
  throw new Error('Roster must be {"administrators":["..."]}');
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const administrators = roster.administrators;
const reservedEmailDomainPattern =
  /@(?:example\.(?:com|net|org)|[^@]+\.(?:example|invalid|test)|localhost)$/i;
if (
  administrators.length < 1 ||
  administrators.length > 20 ||
  administrators.some(
    (email) =>
      typeof email !== "string" ||
      email !== email.trim().toLowerCase() ||
      email.length > 320 ||
      !emailPattern.test(email) ||
      reservedEmailDomainPattern.test(email),
  ) ||
  new Set(administrators).size !== administrators.length
) {
  throw new Error("Roster must contain 1-20 unique lowercase named administrators");
}
if (
  target === "production" &&
  administrators.includes(projectConfig.CLOUDFLARE_PRODUCTION_ACCOUNT_OWNER_EMAIL?.toLowerCase())
) {
  throw new Error(
    "The shared production Cloudflare account owner must not be an app administrator",
  );
}

const canonicalAdministrators = administrators.toSorted();
const shellQuote = (value) => `'${String(value).replaceAll("'", `'"'"'`)}'`;
const adminBinding = JSON.stringify(canonicalAdministrators);
const deployEnvironment = await readFile(deployEnvPath, "utf8");
const matches = deployEnvironment.match(/^ADMIN_EMAILS=.*$/gm) ?? [];
if (matches.length !== 1) {
  throw new Error(`${deployEnvPath} must contain exactly one ADMIN_EMAILS assignment`);
}
const updatedEnvironment = deployEnvironment.replace(
  /^ADMIN_EMAILS=.*$/m,
  `ADMIN_EMAILS=${shellQuote(adminBinding)}`,
);
const temporaryPath = `${deployEnvPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, updatedEnvironment, { encoding: "utf8", mode: 0o600, flag: "wx" });
await chmod(temporaryPath, 0o600);
await rename(temporaryPath, deployEnvPath);

const rosterHash = createHash("sha256")
  .update(JSON.stringify({ administrators: canonicalAdministrators }))
  .digest("hex");
console.log(
  `Updated ${deployEnvPath}: ${canonicalAdministrators.length} named administrators; roster SHA-256 ${rosterHash}. Email addresses were not printed.`,
);
