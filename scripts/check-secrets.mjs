#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function trackedFiles() {
  return execFileSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

function lineNumberForIndex(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function isAllowedValue(value) {
  return (
    value === "" ||
    value.startsWith("replace-with-") ||
    value.startsWith("your-") ||
    value.startsWith("$") ||
    value === "string;" ||
    value.includes("${{") ||
    value.includes("process.env") ||
    value.includes("env.")
  );
}

const findings = [];
const jwtPattern = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g;
const sensitiveAssignments =
  /\b(CLOUDFLARE_API_TOKEN|COOKIE_SIGNING_SECRET|DEV_ADMIN_TOKEN)\s*[=:]\s*["']?([^\s"',}]+)/g;

for (const path of trackedFiles()) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\u0000")) continue;

  for (const [rule, pattern] of [
    ["jwt", jwtPattern],
    ["private_key", privateKeyPattern],
  ]) {
    for (const match of text.matchAll(pattern)) {
      findings.push(`${path}:${lineNumberForIndex(text, match.index ?? 0)} ${rule}`);
    }
  }
  for (const match of text.matchAll(sensitiveAssignments)) {
    const value = match[2] ?? "";
    if (!isAllowedValue(value)) {
      findings.push(
        `${path}:${lineNumberForIndex(text, match.index ?? 0)} committed_${String(match[1]).toLowerCase()}`,
      );
    }
  }
}

if (findings.length > 0) {
  findings.forEach((finding) => console.error(`Secret-like value detected: ${finding}`));
  process.exit(1);
}
console.log("Secret scan passed.");
