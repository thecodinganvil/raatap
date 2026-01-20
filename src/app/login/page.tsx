"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Check if Supabase is properly configured
      const { isSupabaseConfigured } = await import('@/lib/supabase');
      if (!isSupabaseConfigured()) {
        alert('⚠️ Supabase is not configured yet!\n\nPlease add your Supabase credentials to the .env.local file.\n\nSee OAUTH_SETUP.md for detailed instructions.');
        return;
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      
      if (error) {
        console.error('Error signing in with Google:', error.message);
        alert('Failed to sign in with Google. Please try again.');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
              Welcome Back
            </h1>
            <p className="text-gray-500 text-sm mt-2">Sign in to continue to Raatap</p>
          </div>
      
          {/* Google Sign In Button - Primary */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            className="group relative w-full py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-medium rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#6675FF]/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
            <span className="relative flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="white"
                  opacity="0.8"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="white"
                  opacity="0.9"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="white"
                  opacity="0.7"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </span>
            </span>
          </button>
          
          {/* Sign up link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#6675FF] font-medium hover:underline">
              Sign up
            </Link>
          </p>
          
        </div>
        
        {/* Bottom Security Badge */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secured with end-to-end encryption</span>
          </div>
        </div>
        
      </div>
    </main>
  );
}
