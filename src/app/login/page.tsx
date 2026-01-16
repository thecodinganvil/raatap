"use client";

import Link from "next/link";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log("Login:", { email, password });
  };

  return (
    <main className="min-h-screen bg-[#f8f9fc] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        
        {/* Brand Name */}
        <h1 className="text-3xl md:text-4xl font-medium text-center text-[#171717] mb-10">
          Raatap
        </h1>
        
        {/* Form Container */}
        <div className="w-full">
          {/* Get Started Heading */}
          <h2 className="text-2xl md:text-3xl font-medium text-[#6675FF] mb-8">
            Get started
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-normal text-[#171717] mb-2">
                Email-id
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 border-2 border-[#6675FF]/30 rounded-full bg-white text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] transition-colors"
                required
              />
            </div>
            
            {/* Password Input */}
            <div>
              <label className="block text-sm font-normal text-[#171717] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 border-2 border-[#6675FF]/30 rounded-full bg-white text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] transition-colors"
                required
              />
            </div>
            
            {/* Login Button */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                className="px-16 py-3.5 bg-[#6675FF] text-white font-medium rounded-full hover:bg-[#5563e8] transition-all duration-300 hover:shadow-lg hover:shadow-[#6675FF]/30"
              >
                LOG-IN
              </button>
            </div>
            
            {/* Forgot Password */}
            <div className="text-center">
              <Link 
                href="/forgot-password" 
                className="text-sm text-gray-500 hover:text-[#6675FF] transition-colors"
              >
                Forget password ?
              </Link>
            </div>
          </form>
          
          {/* Sign Up Button */}
          <div className="mt-8">
            <Link
              href="/signup"
              className="block w-full py-4 bg-[#6675FF] text-white font-medium text-center rounded-full hover:bg-[#5563e8] transition-all duration-300 hover:shadow-lg hover:shadow-[#6675FF]/30"
            >
              SIGN-UP
            </Link>
          </div>
          
        </div>
      </div>
    </main>
  );
}
