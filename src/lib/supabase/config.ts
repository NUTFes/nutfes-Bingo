export function getSupabaseServerUrl() {
  return process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function hasSupabaseServerEnvVars() {
  const supabaseUrl = getSupabaseServerUrl();

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && supabaseUrl && URL.canParse(supabaseUrl),
  );
}

export function hasSupabaseServiceRoleEnvVars() {
  const supabaseUrl = getSupabaseServerUrl();
  const secretKey = getSupabaseSecretKey();

  return Boolean(secretKey && supabaseUrl && URL.canParse(supabaseUrl));
}

export function shouldSkipSupabaseFetch() {
  return process.env.NUTFES_SKIP_SUPABASE_FETCH === "1";
}

export function isAdminSignupEnabled() {
  if (process.env.NEXT_PUBLIC_ENABLE_ADMIN_SIGNUP === "1") {
    return true;
  }

  return (
    process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_ADMIN_SIGNUP !== "0"
  );
}
