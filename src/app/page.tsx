import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f8f9fc]">
      {/* Hero Section */}
      <section className="w-full px-6 md:px-12 lg:px-20 py-12 md:py-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
          
          {/* Left Content */}
          <div className="flex-1 max-w-xl">
            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-medium leading-tight tracking-tight">
              Let&apos;s go together
            </h1>
            <h2 className="text-4xl md:text-5xl lg:text-[3.5rem] font-medium leading-tight tracking-tight text-[#6675FF] mt-1">
              Share memories
            </h2>
            
            {/* Description */}
            <p className="mt-8 text-lg md:text-xl text-gray-600 leading-relaxed font-normal max-w-md">
              Share rides with trusted community members and make your daily commute easier, cheaper.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-10">
              {/* Pick friend - Outlined Button */}
              <Link 
                href="/pick-friend"
                className="group relative px-8 py-3.5 rounded-full font-medium text-base transition-all duration-300 border-2 border-gray-300 text-gray-700 hover:border-[#6675FF] hover:text-[#6675FF] hover:shadow-lg hover:shadow-[#6675FF]/10"
              >
                Pick friend
              </Link>
              
              {/* Search friend - Filled Button */}
              <Link 
                href="/search-friend"
                className="group relative px-8 py-3.5 rounded-full font-medium text-base transition-all duration-300 bg-[#6675FF] text-white hover:bg-[#5563e8] hover:shadow-lg hover:shadow-[#6675FF]/30 hover:-translate-y-0.5"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></span>
                <span className="relative">Search friend</span>
              </Link>
            </div>
          </div>
          
          {/* Right Content - Illustration */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg lg:max-w-xl">
              <Image
                src="/landingpage_one.png"
                alt="People sharing rides together"
                width={600}
                height={500}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
          
        </div>
      </section>

      {/* About Us Section */}
      <section className="w-full px-6 md:px-12 lg:px-20 py-16 md:py-24 bg-[#f8f9fc]">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Title */}
          <h2 className="text-3xl md:text-4xl font-medium text-center text-[#171717] mb-12 md:mb-16">
            About us
          </h2>
          
          {/* Content Grid */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
            
            {/* Left Content - Text */}
            <div className="flex-1 max-w-xl">
              {/* Blue Tagline */}
              <h3 className="text-2xl md:text-3xl lg:text-[2rem] font-medium text-[#6675FF] leading-tight mb-8">
                Share Rides. Save Costs. Build Connections.
              </h3>
              
              {/* Paragraph 1 */}
              <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-6">
                We connect verified members within a trusted community to make daily commuting safe, convenient, and reliable. By sharing rides, members save money while building connections and trust with others.
              </p>
              
              {/* Paragraph 2 */}
              <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-6">
                Our simple, user-friendly platform makes commuting smarter and more enjoyable, all while supporting a, sustainable future. Collaboration and reliability are at the heart of every journey.
              </p>
              
              {/* Paragraph 3 */}
              <p className="text-gray-700 text-base md:text-lg leading-relaxed mb-10">
                Our mission is to build a trusted, high-quality ridesharing community that keeps members safely connected. We aim to foster collaboration, strong bonds, and smarter, commuting for everyone.
              </p>
              
              {/* Join Community Button */}
              <Link 
                href="/community"
                className="group relative inline-flex px-8 py-3.5 rounded-full font-medium text-base transition-all duration-300 bg-[#6675FF] text-white hover:bg-[#5563e8] hover:shadow-lg hover:shadow-[#6675FF]/30 hover:-translate-y-0.5"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></span>
                <span className="relative">Join Community</span>
              </Link>
            </div>
            
            {/* Right Content - Illustration */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md lg:max-w-lg">
                <Image
                  src="/aboutus_one.png"
                  alt="Community of people connecting"
                  width={500}
                  height={400}
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Why Ride With Us Section */}
      <section className="w-full px-6 md:px-12 lg:px-20 py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Title */}
          <h2 className="text-3xl md:text-4xl font-medium text-center text-[#171717] mb-20 md:mb-28">
            Why Ride With Us
          </h2>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12 lg:gap-20">
            
            {/* Feature 1 - Community Support */}
            <div className="flex flex-col items-start">
              <div className="mb-6">
                <Image
                  src="/community_support.png"
                  alt="Community Support"
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain"
                />
              </div>
              <h3 className="text-xl font-medium text-[#171717] mb-4">
                Community Support
              </h3>
              <p className="text-gray-600 text-base leading-relaxed">
                A closed network encourages collaboration, networking, and a sense of belonging.
              </p>
            </div>
            
            {/* Feature 2 - Trust */}
            <div className="flex flex-col items-start">
              <div className="mb-6">
                <Image
                  src="/trust.png"
                  alt="Trust"
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain"
                />
              </div>
              <h3 className="text-xl font-medium text-[#171717] mb-4">
                Trust
              </h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Members are accountable to the community, promoting responsible and respectful behavior.
              </p>
            </div>
            
            {/* Feature 3 - Cost Savings */}
            <div className="flex flex-col items-start">
              <div className="mb-6">
                <Image
                  src="/cost_saving.png"
                  alt="Cost Savings"
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain"
                />
              </div>
              <h3 className="text-xl font-medium text-[#171717] mb-4">
                Cost Savings
              </h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Share commuting expenses like fuel and tolls, making daily travel more affordable.
              </p>
            </div>
            
          </div>
        </div>
      </section>
    </main>
  );
}
