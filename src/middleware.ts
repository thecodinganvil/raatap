import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware for Supabase SSR Session Management
 *
 * This middleware ONLY refreshes session cookies - it does NOT block routes.
 * Route protection is handled by client-side components (DashboardContent.tsx, etc.)
 *
 * This is done because:
 * 1. Client-side Supabase auth stores session in cookies
 * 2. Middleware runs on edge and may not always see fresh cookies immediately after login
 * 3. Client-side protection is more reliable for SPAs with client-side auth
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session - this is the ONLY job of this middleware
  // It ensures session cookies are refreshed on each request
  await supabase.auth.getUser();

  // Always allow the request through
  // Client-side components handle their own auth and redirects
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Run middleware on all routes except:
     * - API routes (handle own auth)
     * - Static files
     * - Images
     */
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
