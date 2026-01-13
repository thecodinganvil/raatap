"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full px-6 md:px-12 py-4 bg-gradient-to-r from-white/80 via-white/90 to-white/80 backdrop-blur-xl border-b border-[#6675FF]/20 shadow-[0_4px_30px_rgba(102,117,255,0.1)] rounded-b-2xl">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo and Brand Name */}
        <Link href="/" className="flex items-center gap-3 no-underline group">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#6675FF]/20 to-[#8892ff]/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Image
              src="/favicon.png"
              alt="Rataap Logo"
              width={42}
              height={42}
              className="relative w-10 h-10 md:w-11 md:h-11 object-contain drop-shadow-sm"
            />
          </div>
          <span className="text-2xl md:text-3xl font-medium tracking-tight bg-gradient-to-r from-[#171717] to-[#3a3a3a] bg-clip-text text-transparent">
            Rataap
          </span>
        </Link>

        {/* Sign-up Button */}
        <Link 
          href="/signup" 
          className="group relative px-6 md:px-8 py-2.5 md:py-3 overflow-hidden rounded-full font-medium text-sm md:text-base transition-all duration-300"
        >
          {/* Button background gradient */}
          <span className="absolute inset-0 bg-gradient-to-r from-[#6675FF] to-[#8892ff] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          
          {/* Button border */}
          <span className="absolute inset-0 rounded-full border-2 border-[#6675FF] group-hover:border-transparent transition-colors duration-300"></span>
          
          {/* Shine effect on hover */}
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
          
          {/* Button text */}
          <span className="relative text-[#6675FF] group-hover:text-white transition-colors duration-300">
            Sign-up
          </span>
        </Link>
      </div>
    </header>
  );
}
