import {
  getSupabasePublishableKey,
  getSupabaseServerUrl,
  hasSupabaseServerEnvVars,
} from "@/lib/supabase/config";
import {
  createPublicClientId,
  PUBLIC_CLIENT_ID_COOKIE,
  PUBLIC_CLIENT_ID_MAX_AGE,
} from "@/lib/public-client";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isProtectedPath(pathname: string) {
  const isAdminAuthPath = pathname === "/admin/login" || pathname === "/admin/auth-error";

  return (pathname === "/admin" || pathname.startsWith("/admin/")) && !isAdminAuthPath;
}

function shouldIssuePublicClientId(request: NextRequest) {
  const { pathname } = request.nextUrl;

  return (
    request.method === "GET" &&
    pathname !== "/admin" &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/admin/")
  );
}

function withPublicClientCookie(request: NextRequest, response: NextResponse) {
  if (!shouldIssuePublicClientId(request) || request.cookies.has(PUBLIC_CLIENT_ID_COOKIE)) {
    return response;
  }

  response.cookies.set(PUBLIC_CLIENT_ID_COOKIE, createPublicClientId(), {
    httpOnly: true,
    maxAge: PUBLIC_CLIENT_ID_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasSupabaseServerEnvVars() || !isProtectedPath(request.nextUrl.pathname)) {
    return withPublicClientCookie(request, supabaseResponse);
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(getSupabaseServerUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    const redirectTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return withPublicClientCookie(request, supabaseResponse);
}
