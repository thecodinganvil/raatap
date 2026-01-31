import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware for Supabase SSR Session Management
 *
 * This middleware:
 * 1. Refreshes session cookies
 * 2. Redirects logged-in users from homepage to dashboard
 *
 * Route protection for /dashboard is handled by client-side components.
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

  // Refresh session and get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is logged in and on homepage, redirect to dashboard
  const pathname = request.nextUrl.pathname;
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

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
