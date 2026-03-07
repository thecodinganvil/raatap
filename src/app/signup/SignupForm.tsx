"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export default function SignupForm() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // Email/Password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Check if user is already logged in (handles OAuth redirect case)
  useEffect(() => {
    const handleAuth = async () => {
      if (!isSupabaseConfigured()) {
        setCheckingSession(false);
        return;
      }

      // Check for existing session (Supabase auto-detects tokens in URL with implicit flow)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("Session found, redirecting to dashboard...");
        window.location.href = "/dashboard";
        return;
      }

      setCheckingSession(false);
    };

    handleAuth();

    // Listen for auth state changes - handles OAuth callback
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Signup auth state changed:", event, session?.user?.email);
      if (event === "SIGNED_IN" && session?.user) {
        console.log("User signed in, redirecting to dashboard...");
        window.location.href = "/dashboard";
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");

      if (!isSupabaseConfigured()) {
        setError("⚠️ Supabase is not configured yet!");
        return;
      }

      // Clear any stale auth data before starting new OAuth flow
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("supabase") || key.includes("sb-"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Use implicit flow - redirect back to signup page, tokens come in URL hash
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/signup`,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error("Error signing in with Google:", error.message);
        setError("Failed to sign in with Google. Please try again.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setEmailLoading(true);

    if (!isSupabaseConfigured()) {
      setError("⚠️ Supabase is not configured yet!");
      setEmailLoading(false);
      return;
    }

    try {
      console.log("Signing up with:", { email, passwordLength: password.length });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log("Signup response:", { data, error });

      if (error) {
        console.error("Supabase error details:", error);
        setError(error.message);
      } else if (data.user && data.user.identities?.length === 0) {
         setError("This email is already registered. Please sign in instead.");
      } else if (data.session) {
        // If "Confirm email" is disabled in Supabase, we get a session immediately
        console.log("Signup successful, session created. Redirecting...");
        window.location.href = "/dashboard";
      } else {
        // If "Confirm email" is enabled, we don't get a session
        setSuccessMessage(
          "Success! Please check your email to confirm your account."
        );
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("An unexpected error occurred during sign up.");
    } finally {
      setEmailLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#6675FF]/20"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] flex items-center justify-center px-4 py-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-lg">
        {/* Card Container */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 p-8 md:p-10 border border-white/50">
          {/* Logo & Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="absolute -inset-3 bg-gradient-to-r from-[#6675FF]/20 to-[#8892ff]/20 rounded-full blur-xl"></div>
              <Image
                src="/favicon.png"
                alt="Raatap Logo"
                width={56}
                height={56}
                className="relative w-14 h-14 object-contain"
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-medium text-[#171717]">
              Join Raatap
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              Create your account to get started
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-600 text-center">
                {successMessage}
              </p>
            </div>
          )}

          {/* Email Sign Up Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4 mb-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6675FF] focus:border-[#6675FF] outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6675FF] focus:border-[#6675FF] outline-none transition-all"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters
              </p>
            </div>
            <button
              type="submit"
              disabled={emailLoading || googleLoading}
              className="w-full py-4 bg-[#6675FF] text-white font-medium rounded-2xl shadow-lg shadow-[#6675FF]/25 hover:bg-[#5563dd] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <span className="relative bg-white/80 px-4 text-sm text-gray-500">
              or continue with
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || emailLoading}
            type="button"
            className="group relative w-full py-4 bg-white border-2 border-gray-200 text-[#171717] font-medium rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#6675FF]/50 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {googleLoading ? "Connecting..." : "Google"}
              </span>
            </span>
          </button>

          {/* Terms & Conditions */}
          <div className="pt-6">
            <p className="text-xs text-center text-gray-500 leading-relaxed">
              By signing up, you agree to our{" "}
              <Link
                href="/terms_&_conditions"
                className="text-[#6675FF] font-medium hover:underline"
              >
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy_policy"
                className="text-[#6675FF] font-medium hover:underline"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
          
           {/* Sign In Link */}
           <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#6675FF] font-medium hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>

        {/* Bottom Security Badge */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Secured with Supabase</span>
          </div>
        </div>
      </div>
    </main>
  );
}
