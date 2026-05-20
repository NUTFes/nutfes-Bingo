export function getSupabaseServerUrl() {
  return process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function hasSupabaseServerEnvVars() {
  const supabaseUrl = getSupabaseServerUrl();

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && supabaseUrl && URL.canParse(supabaseUrl),
  );
}

export function shouldSkipSupabaseFetch() {
  return process.env.NUTFES_SKIP_SUPABASE_FETCH === "1";
}
