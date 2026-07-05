export function getSupabaseServerUrl() {
  return process.env.SUPABASE_SERVER_URL || "";
}

export function getSupabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.ANON_KEY || "";
}

export function getSupabaseSecretKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function hasSupabaseServerEnvVars() {
  const supabaseUrl = getSupabaseServerUrl();
  const publishableKey = getSupabasePublishableKey();

  return Boolean(publishableKey && supabaseUrl && URL.canParse(supabaseUrl));
}

export function hasSupabaseServiceRoleEnvVars() {
  const supabaseUrl = getSupabaseServerUrl();
  const secretKey = getSupabaseSecretKey();

  return Boolean(secretKey && supabaseUrl && URL.canParse(supabaseUrl));
}

export function shouldSkipSupabaseFetch() {
  return process.env.NUTFES_SKIP_SUPABASE_FETCH === "1";
}
