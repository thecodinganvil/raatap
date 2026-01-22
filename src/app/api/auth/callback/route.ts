import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';
  const type = requestUrl.searchParams.get('type'); // 'signup', 'recovery', 'invite'

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Handle cookie setting errors
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }

    // Check the type of callback
    if (type === 'signup' || type === 'email') {
      // Email verification completed
      if (data.user?.email_confirmed_at) {
        // User verified their email, redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard?verified=true', requestUrl.origin));
      }
    }

    if (type === 'recovery') {
      // Password recovery flow
      return NextResponse.redirect(new URL('/reset-password', requestUrl.origin));
    }

    // Check if user's email is verified
    if (data.user && !data.user.email_confirmed_at) {
      // Email not verified yet
      return NextResponse.redirect(new URL('/verify-email', requestUrl.origin));
    }

    // Successfully authenticated with verified email
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  // No code present, check for error
  const errorDescription = requestUrl.searchParams.get('error_description');
  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, requestUrl.origin)
    );
  }

  // No code or error, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
