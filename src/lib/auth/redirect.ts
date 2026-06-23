export function sanitizeRedirectTo(redirectTo: string | null | undefined, fallback = "/admin") {
  if (!redirectTo) {
    return fallback;
  }

  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : fallback;
}
