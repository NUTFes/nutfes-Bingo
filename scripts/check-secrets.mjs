#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function trackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return output.split(/\r?\n/).filter(Boolean);
}

function isBinary(text) {
  return text.includes("\u0000");
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function envValue(line, name) {
  const match = new RegExp(`^${name}=([^#\\r\\n]*)`).exec(line.trim());
  if (!match) {
    return null;
  }

  let value = match[1].trim();
  if (
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) &&
    value.length >= 2
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function isAllowedPlaceholder(value) {
  return value.startsWith("replace-with-") || value === "[]" || value === '{"keys":[]}';
}

function isTurnstileTestSecret(value) {
  return new Set([
    "1x0000000000000000000000000000000AA",
    "2x0000000000000000000000000000000AA",
    "3x0000000000000000000000000000000AA",
    "test-turnstile-secret",
  ]).has(value);
}

function addFinding(findings, path, line, rule) {
  findings.push(`Secret-like value detected: ${path}:${line} ${rule}`);
}

const findings = [];
const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

for (const path of trackedFiles()) {
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  if (isBinary(text)) {
    continue;
  }

  for (const match of text.matchAll(jwtPattern)) {
    addFinding(findings, path, lineNumberForIndex(text, match.index ?? 0), "jwt_value");
  }

  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const lineNo = index + 1;

    const turnstileSecret = envValue(line, "TURNSTILE_SECRET_KEY");
    if (
      turnstileSecret !== null &&
      turnstileSecret !== "" &&
      !isAllowedPlaceholder(turnstileSecret) &&
      !isTurnstileTestSecret(turnstileSecret)
    ) {
      addFinding(findings, path, lineNo, "turnstile_secret_key");
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(finding);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
