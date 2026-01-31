"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    window.location.href = "/";
  };

  // Hide signup button on auth pages (show profile instead if logged in)
  const isAuthPage = ["/login", "/signup"].some((path) =>
    pathname?.startsWith(path),
  );

  return (
    <header className="sticky top-0 z-50 w-full px-6 md:px-12 py-4 bg-gradient-to-r from-white/80 via-white/90 to-white/80 backdrop-blur-xl border-b border-[#6675FF]/20 shadow-[0_4px_30px_rgba(102,117,255,0.1)] rounded-b-2xl">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo and Brand Name */}
        <Link href="/" className="flex items-center no-underline group">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#6675FF]/20 to-[#8892ff]/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Image
              src="/favicon.png"
              alt="Raatap Logo"
              width={42}
              height={42}
              className="relative w-10 h-10 md:w-11 md:h-11 object-contain drop-shadow-sm"
            />
          </div>
          <span className="text-2xl md:text-3xl font-medium tracking-tight bg-gradient-to-r from-[#171717] to-[#3a3a3a] bg-clip-text text-transparent">
            Raatap
          </span>
        </Link>

        {/* Right Side - Profile with Verification Status */}
        <div className="flex flex-col items-center gap-1">
          {/* User Icon Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="relative group"
            >
              {/* Circle border */}
              <div
                className="absolute inset-0 rounded-full border-2 border-[#6675FF] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  width: "56px",
                  height: "56px",
                  top: "-8px",
                  left: "-8px",
                }}
              ></div>

              {/* User avatar/icon */}
              <div className="w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center">
                {user?.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full border-2 border-[#6675FF]/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6675FF] to-[#8892ff] flex items-center justify-center text-white font-medium text-lg">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>

              {/* Verification Badge - Green checkmark if verified */}
              {user && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-md">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-4 w-80 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/20 border-2 border-gray-100/50 py-4 animate-fadeIn overflow-hidden">
                {/* User Info */}
                <div className="px-5 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    {user?.user_metadata?.avatar_url ? (
                      <div className="relative">
                        <Image
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-2xl ring-2 ring-[#6675FF]/20"
                        />
                        {user && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-md">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6675FF] to-[#8892ff] flex items-center justify-center text-white font-semibold text-xl shadow-lg">
                        {user?.email?.charAt(0).toUpperCase() || "U"}
                        {user && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center shadow-md">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#171717] truncate text-base">
                        {user?.user_metadata?.full_name || "User"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user?.email || "Not signed in"}
                      </p>
                      {user && (
                        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-0.5 bg-green-50 rounded-full w-fit">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-700 font-medium">
                            Verified
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2 px-2">
                  {user ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-[#6675FF]/5 hover:to-transparent rounded-2xl transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#6675FF]/10 flex items-center justify-center group-hover:bg-[#6675FF]/20 transition-colors">
                        <svg
                          className="w-5 h-5 text-[#6675FF]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                      <span className="font-medium">Dashboard</span>
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gradient-to-r hover:from-[#6675FF]/5 hover:to-transparent rounded-2xl transition-all group mb-1"
                      >
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-[#6675FF]/10 transition-colors">
                          <svg
                            className="w-5 h-5 text-gray-600 group-hover:text-[#6675FF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </div>
                        <span className="font-medium">Sign In</span>
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-[#6675FF] hover:bg-gradient-to-r hover:from-[#6675FF]/5 hover:to-transparent rounded-2xl transition-all group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-[#6675FF]/10 flex items-center justify-center group-hover:bg-[#6675FF]/20 transition-colors">
                          <svg
                            className="w-5 h-5 text-[#6675FF]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                            />
                          </svg>
                        </div>
                        <span className="font-medium">Sign Up</span>
                      </Link>
                    </>
                  )}
                </div>

                {/* Sign Out */}
                {user && (
                  <div className="pt-2 border-t border-gray-100">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verification Status Label */}
          {!user && (
            <div className="px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
              <span className="text-xs font-semibold text-red-600">
                NOT VERIFIED !
              </span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </header>
  );
}
