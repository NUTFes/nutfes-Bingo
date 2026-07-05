#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const command = process.argv[2] ?? "";

function fail(message) {
  console.error(`Local admin operation failed: ${message}`);
  process.exit(1);
}

function usage() {
  console.error(`Usage: local-admin.mjs COMMAND

Commands:
  bootstrap       Create or update a local admin account
  reset-password  Reset an existing local admin password
  list            List local admin accounts
  verify          Verify that at least one local admin account exists

Environment:
  ADMIN_EMAIL            Required for bootstrap/reset-password
  ADMIN_PASSWORD_FILE    Required for bootstrap/reset-password; mode 0600 or 0400
`);
}

function parseStatusEnv() {
  let output = "";
  try {
    output = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail("local Supabase is not running; run `mise run db-up` or `mise run up` first");
  }

  const env = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        try {
          value = JSON.parse(value);
        } catch {
          value = value.slice(1, -1);
        }
      }
      env.set(match[1], value);
    }
  }

  return env;
}

function normalizeEmail(raw) {
  const email = raw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail("ADMIN_EMAIL must be a valid email address");
  }
  return email;
}

function readPassword() {
  const passwordFile = process.env.ADMIN_PASSWORD_FILE;
  if (!passwordFile) {
    fail("ADMIN_PASSWORD_FILE is required");
  }

  let mode = "";
  try {
    mode = (statSync(passwordFile).mode & 0o777).toString(8).padStart(3, "0");
  } catch {
    fail(`ADMIN_PASSWORD_FILE does not exist: ${passwordFile}`);
  }

  if (mode !== "400" && mode !== "600") {
    fail(`ADMIN_PASSWORD_FILE must be mode 0600 or 0400, got ${mode}`);
  }

  const password = readFileSync(passwordFile, "utf8").replace(/\r?\n$/, "");
  if ([...password].length < 12) {
    fail("admin password must be at least 12 characters");
  }

  return password;
}

function getClient() {
  const status = parseStatusEnv();
  const apiUrl = status.get("API_URL") ?? "http://127.0.0.1:54321";
  const serviceRoleKey = status.get("SERVICE_ROLE_KEY");

  if (!serviceRoleKey) {
    fail("SERVICE_ROLE_KEY was not returned by `supabase status -o env`");
  }

  return createClient(apiUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function listAllUsers(supabase) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      fail(error.message);
    }

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < 1000) {
      return users;
    }
  }
}

async function findUserByEmail(supabase, email) {
  const users = await listAllUsers(supabase);
  return users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

async function upsertAdminProfile(supabase, userId, email) {
  const { error } = await supabase.from("profiles").upsert({ id: userId, email, role: "admin" });
  if (error) {
    fail(error.message);
  }
}

async function bootstrap() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  const password = readPassword();
  const supabase = getClient();
  const existingUser = await findUserByEmail(supabase, email);

  let userId = existingUser?.id;
  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      app_metadata: {
        ...existingUser.app_metadata,
        role: "admin",
        source: "nutfes-bingo-local-admin-cli",
      },
    });
    if (error) {
      fail(error.message);
    }
    console.log(`Updated local Auth user for ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: "admin",
        source: "nutfes-bingo-local-admin-cli",
      },
      user_metadata: {
        purpose: "nutfes-bingo-admin",
      },
    });
    if (error) {
      fail(error.message);
    }
    userId = data.user?.id;
    console.log(`Created local Auth user for ${email}`);
  }

  if (!userId) {
    fail("Auth Admin API did not return a user id");
  }

  await upsertAdminProfile(supabase, userId, email);
  console.log(`Local admin is ready: ${email}`);
}

async function resetPassword() {
  const email = normalizeEmail(process.env.ADMIN_EMAIL ?? "");
  const password = readPassword();
  const supabase = getClient();
  const user = await findUserByEmail(supabase, email);

  if (!user) {
    fail(`admin not found for ADMIN_EMAIL=${email}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    fail(profileError.message);
  }
  if (profile?.role !== "admin") {
    fail(`user exists but is not admin: ${email}`);
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    fail(error.message);
  }

  console.log(`Reset local admin password: ${email}`);
}

async function listAdmins() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,created_at,updated_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  if (error) {
    fail(error.message);
  }

  if (!data?.length) {
    console.log("No local admin accounts found.");
    return;
  }

  for (const admin of data) {
    console.log(`${admin.email ?? "(no email)"}\t${admin.id}\t${admin.role}`);
  }
}

async function verifyAdmin() {
  const supabase = getClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) {
    fail(error.message);
  }

  if (!count) {
    fail("no local admin accounts found");
  }

  console.log(`Local admin accounts found: ${count}`);
}

switch (command) {
  case "bootstrap":
    await bootstrap();
    break;
  case "reset-password":
    await resetPassword();
    break;
  case "list":
    await listAdmins();
    break;
  case "verify":
    await verifyAdmin();
    break;
  default:
    usage();
    process.exit(1);
}
