#!/usr/bin/env node

import { readFileSync } from "node:fs";

const EXPECTED_NODE = "26.2.0";
const EXPECTED_PNPM = "11.2.2";
const files = [
  "mise.toml",
  "package.json",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/react-doctor.yml",
  "README.md",
];
const findings = [];

function fail(path, message) {
  findings.push(`${path}: ${message}`);
}

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    fail(path, `cannot read file: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function assertIncludes(path, text, needle, label) {
  if (!text.includes(needle)) fail(path, `missing ${label}: ${needle}`);
}

function rejectVersionRegex(path, text, regex, expected, label) {
  for (const match of text.matchAll(regex)) {
    const value = match.groups?.version ?? match[1];
    if (value !== expected) fail(path, `${label} version ${value} must be ${expected}`);
  }
}

for (const path of files) {
  const text = read(path);
  if (path === "mise.toml") {
    assertIncludes(path, text, `node = "${EXPECTED_NODE}"`, "mise Node pin");
    assertIncludes(path, text, `pnpm = "${EXPECTED_PNPM}"`, "mise pnpm pin");
  } else if (path === "package.json") {
    const manifest = JSON.parse(text);
    if (manifest.engines?.node !== EXPECTED_NODE)
      fail(path, `engines.node must be ${EXPECTED_NODE}`);
    if (manifest.engines?.pnpm !== EXPECTED_PNPM)
      fail(path, `engines.pnpm must be ${EXPECTED_PNPM}`);
    if (manifest.packageManager !== `pnpm@${EXPECTED_PNPM}`)
      fail(path, `packageManager must be pnpm@${EXPECTED_PNPM}`);
  } else if (path.startsWith(".github/workflows/")) {
    assertIncludes(path, text, `NODE_VERSION: "${EXPECTED_NODE}"`, "workflow Node pin");
    assertIncludes(path, text, `PNPM_VERSION: "${EXPECTED_PNPM}"`, "workflow pnpm pin");
  } else {
    rejectVersionRegex(
      path,
      text,
      /Node(?:\.js)?\s+`?(?<version>\d+\.\d+\.\d+)`?/gi,
      EXPECTED_NODE,
      "documented Node",
    );
    rejectVersionRegex(
      path,
      text,
      /pnpm\s+`?(?<version>\d+\.\d+\.\d+)`?/gi,
      EXPECTED_PNPM,
      "documented pnpm",
    );
  }
}

if (findings.length > 0) {
  findings.forEach((finding) => console.error(finding));
  process.exit(1);
}
console.log("Tool version check passed.");
