#!/bin/sh

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
env_file=${ENV_FILE:-$repo_root/.env.production}
cmd=${1:-}

password_file=
cleanup() {
  if [ -n "$password_file" ] && [ -f "$password_file" ] && [ "${ADMIN_PASSWORD_FILE:-}" = "" ]; then
    rm -f "$password_file"
  fi
}
trap cleanup EXIT HUP INT TERM

usage() {
  cat >&2 <<'USAGE'
Usage: admin.sh COMMAND

Commands:
  bootstrap       Create or update the initial production admin account
  reset-password  Reset an existing admin password
  list            List admin accounts
  verify          Verify that at least one admin account exists

Environment:
  ADMIN_EMAIL                         Required for bootstrap/reset-password
  ADMIN_PASSWORD_FILE                 Optional; otherwise the script prompts
  CONFIRM_BOOTSTRAP_ADMIN             Must be bootstrap-nutfes-bingo-admin
  CONFIRM_RESET_ADMIN_PASSWORD        Must be reset-nutfes-bingo-admin-password
  ENV_FILE                            Defaults to .env.production
USAGE
}

fail() {
  echo "Admin operation failed: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required"
}

load_env_file() {
  [ -f "$env_file" ] || fail "env file not found: $env_file"

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "" | \#*) continue ;;
      *=*) export "$line" ;;
      *) fail "invalid env line in $env_file: $line" ;;
    esac
  done <"$env_file"
}

compose() {
  ENV_FILE="$env_file" "$repo_root/infra/scripts/compose.sh" "$@"
}

psql() {
  compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

psql_scalar() {
  psql -X -A -t "$@"
}

normalize_email() {
  ADMIN_EMAIL_INPUT=$1 node -e '
const email = (process.env.ADMIN_EMAIL_INPUT || "").trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) process.exit(1);
process.stdout.write(email);
'
}

require_admin_email() {
  [ -n "${ADMIN_EMAIL:-}" ] || fail "ADMIN_EMAIL is required"
  if ! normalized=$(normalize_email "$ADMIN_EMAIL"); then
    fail "ADMIN_EMAIL must be a valid email address"
  fi
  printf '%s' "$normalized"
}

prepare_password_file() {
  if [ -n "${ADMIN_PASSWORD_FILE:-}" ]; then
    [ -f "$ADMIN_PASSWORD_FILE" ] || fail "ADMIN_PASSWORD_FILE does not exist: $ADMIN_PASSWORD_FILE"
    mode=$(stat -c "%a" "$ADMIN_PASSWORD_FILE" 2>/dev/null || printf unknown)
    case "$mode" in
      400 | 600) ;;
      *) fail "ADMIN_PASSWORD_FILE must be mode 0600 or 0400, got $mode" ;;
    esac
    password_file=$ADMIN_PASSWORD_FILE
  else
    [ -t 0 ] || fail "ADMIN_PASSWORD_FILE is required when stdin is not a terminal"
    password_file=$(mktemp)
    chmod 600 "$password_file"
    printf 'Admin password: ' >&2
    stty -echo
    IFS= read -r first_password
    stty echo
    printf '\nConfirm admin password: ' >&2
    stty -echo
    IFS= read -r second_password
    stty echo
    printf '\n' >&2

    [ "$first_password" = "$second_password" ] || fail "password confirmation does not match"
    printf '%s' "$first_password" >"$password_file"
  fi

  password_length=$(compose run --rm --no-deps -T --entrypoint node app -e '
const fs = require("fs");
const password = fs.readFileSync(0, "utf8").replace(/\r?\n$/, "");
process.stdout.write(String([...password].length));
' <"$password_file")

  [ "$password_length" -ge 12 ] || fail "admin password must be at least 12 characters"
}

json_payload_for_password() {
  email=$1
  mode=$2

  compose run --rm --no-deps -T --entrypoint node \
    -e ADMIN_EMAIL_NORMALIZED="$email" \
    -e ADMIN_PAYLOAD_MODE="$mode" \
    app -e '
const fs = require("fs");
const password = fs.readFileSync(0, "utf8").replace(/\r?\n$/, "");
const payload = {
  password,
  email_confirm: true,
  phone_confirm: false,
  app_metadata: {
    role: "admin",
    source: "nutfes-bingo-admin-cli",
  },
};

if (process.env.ADMIN_PAYLOAD_MODE === "create") {
  payload.email = process.env.ADMIN_EMAIL_NORMALIZED;
  payload.user_metadata = {
    purpose: "nutfes-bingo-admin",
  };
}

process.stdout.write(JSON.stringify(payload));
' <"$password_file"
}

auth_admin_request() {
  method=$1
  path=$2
  payload=${3:-}

  printf '%s' "$payload" | compose run --rm --no-deps -T --entrypoint node app -e '
const fs = require("fs");
const [path, method] = process.argv.slice(1);
const rawBody = fs.readFileSync(0, "utf8");
const baseUrl = (process.env.SUPABASE_SERVER_URL || "").replace(/\/$/, "");
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

(async () => {
  if (!baseUrl || !secretKey) {
    throw new Error("SUPABASE_SERVER_URL and SUPABASE_SECRET_KEY are required inside the app container");
  }

  const response = await fetch(`${baseUrl}/auth/v1${path}`, {
    method,
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: rawBody ? rawBody : undefined,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  process.stdout.write(text || "{}");
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
' "$path" "$method"
}

get_user_id_by_email() {
  email=$1
  psql_scalar -v admin_email="$email" <<'SQL'
select id from auth.users where lower(email) = lower(:'admin_email') order by created_at asc limit 1;
SQL
}

get_admin_user_id_by_email() {
  email=$1
  psql_scalar -v admin_email="$email" <<'SQL'
select p.id from public.profiles p join auth.users u on u.id = p.id where p.role = 'admin' and lower(u.email) = lower(:'admin_email') order by p.created_at asc limit 1;
SQL
}

get_other_admin_count() {
  email=$1
  psql_scalar -v admin_email="$email" <<'SQL'
select count(*) from public.profiles p join auth.users u on u.id = p.id where p.role = 'admin' and lower(u.email) <> lower(:'admin_email');
SQL
}

require_private_bootstrap_function() {
  function_name=$(psql_scalar -c "select coalesce(to_regprocedure('private.bootstrap_initial_admin(uuid,text)')::text, '');")
  [ "$function_name" = "private.bootstrap_initial_admin(uuid,text)" ] ||
    fail "private.bootstrap_initial_admin(uuid,text) is missing; run mise run prod:deploy first"
}

extract_user_id() {
  node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(0, "utf8"));
if (!data.id) process.exit(1);
process.stdout.write(data.id);
'
}

bootstrap_admin() {
  [ "${CONFIRM_BOOTSTRAP_ADMIN:-}" = "bootstrap-nutfes-bingo-admin" ] ||
    fail "set CONFIRM_BOOTSTRAP_ADMIN=bootstrap-nutfes-bingo-admin to confirm"

  email=$(require_admin_email)
  prepare_password_file
  require_private_bootstrap_function

  other_admin_count=$(get_other_admin_count "$email")
  [ "$other_admin_count" = "0" ] ||
    fail "another admin already exists; use prod:admin:list to inspect current admins"

  user_id=$(get_user_id_by_email "$email")
  if [ -z "$user_id" ]; then
    payload=$(json_payload_for_password "$email" create)
    response=$(auth_admin_request POST /admin/users "$payload")
    user_id=$(printf '%s' "$response" | extract_user_id)
    echo "Created Auth user for $email"
  else
    payload=$(json_payload_for_password "$email" update)
    auth_admin_request PUT "/admin/users/$user_id" "$payload" >/dev/null
    echo "Updated existing Auth user for $email"
  fi

  psql -X -v user_id="$user_id" -v admin_email="$email" <<'SQL'
select * from private.bootstrap_initial_admin(:'user_id'::uuid, :'admin_email');
SQL

  echo "Initial admin is ready: $email"
}

reset_admin_password() {
  [ "${CONFIRM_RESET_ADMIN_PASSWORD:-}" = "reset-nutfes-bingo-admin-password" ] ||
    fail "set CONFIRM_RESET_ADMIN_PASSWORD=reset-nutfes-bingo-admin-password to confirm"

  email=$(require_admin_email)
  prepare_password_file

  user_id=$(get_admin_user_id_by_email "$email")
  [ -n "$user_id" ] || fail "admin not found for ADMIN_EMAIL=$email"

  payload=$(json_payload_for_password "$email" update)
  auth_admin_request PUT "/admin/users/$user_id" "$payload" >/dev/null
  echo "Admin password reset for $email"
}

list_admins() {
  psql -X -P pager=off -c \
    "select p.id, coalesce(u.email, p.email) as email, p.created_at, p.updated_at, u.last_sign_in_at from public.profiles p left join auth.users u on u.id = p.id where p.role = 'admin' order by p.created_at asc;"
}

verify_admins() {
  admin_count=$(psql_scalar -c "select count(*) from public.profiles where role = 'admin';")
  if [ "$admin_count" -lt 1 ]; then
    fail "no admin account exists"
  fi

  echo "Admin account check passed: $admin_count admin(s)"
}

require_command docker
require_command stat
load_env_file

case "$cmd" in
  bootstrap)
    bootstrap_admin
    ;;
  reset-password)
    reset_admin_password
    ;;
  list)
    list_admins
    ;;
  verify)
    verify_admins
    ;;
  *)
    usage
    exit 2
    ;;
esac
