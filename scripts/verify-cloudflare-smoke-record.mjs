#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

import { validateStagingSmokeRecord } from "./cloudflare-evidence.mjs";

const [recordPath, sourceReleaseSha, workerVersionId] = process.argv.slice(2);
if (!recordPath || !sourceReleaseSha || !workerVersionId) {
  console.error(
    "Usage: node scripts/verify-cloudflare-smoke-record.mjs <record.json> <release-sha> <staging-version-id>",
  );
  process.exit(2);
}

const record = JSON.parse(await readFile(recordPath, "utf8"));
validateStagingSmokeRecord(record, { sourceReleaseSha, workerVersionId });
console.log(`Verified staging smoke record for git:${sourceReleaseSha} (${workerVersionId}).`);
