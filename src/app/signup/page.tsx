"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Signup:", { name, email, college, phone, gender });
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
              Raatap
            </h1>
          </div>
      
          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name Input */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
                  required
                />
              </div>
            </div>
            
            {/* Email Input */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@email.com"
                  className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
                  required
                />
              </div>
            </div>
            
            {/* College Input */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                College
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Your college name"
                  className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
                  required
                />
              </div>
            </div>
            
            {/* Phone Number Input */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 12345 67890"
                  className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
                  required
                />
              </div>
            </div>
            
            {/* Gender Select */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                Gender
              </label>
              <div className="relative">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10 appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Terms & Conditions */}
            <div className="pt-2">
              <p className="text-xs text-center text-gray-500 leading-relaxed">
                By signing up, you agree to receive OTP via WhatsApp and accept our{" "}
                <Link href="/terms_&_conditions" className="text-[#6675FF] font-medium hover:underline">
                  Terms and Conditions
                </Link>
                {" "}and{" "}
                <Link href="/privacy_policy" className="text-[#6675FF] font-medium hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </div>
            
            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="group relative w-full py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-medium rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#6675FF]/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                <span className="relative flex items-center justify-center gap-2">
                  Next
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </form>
          
          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
          
          {/* Already have account */}
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#6675FF] font-medium hover:underline">
              Log in
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
