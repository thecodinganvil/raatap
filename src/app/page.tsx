import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raatap - Community Ride Sharing | Share Rides, Save Costs",
  description:
    "Join Raatap to share rides with trusted community members. Make your daily commute easier, cheaper, and more enjoyable with India's trusted ride-sharing platform.",
  keywords: [
    "ride sharing India",
    "community carpooling",
    "trusted ride sharing",
    "college commute",
    "affordable transportation",
    "Hyderabad carpooling",
  ],
  openGraph: {
    title: "Raatap - Let's Go Together, Share Memories",
    description:
      "Share rides with trusted community members and make your daily commute easier, cheaper.",
    url: "https://raatap.com",
    images: [
      {
        url: "/landingpage_one.png",
        width: 1200,
        height: 630,
        alt: "Raatap - People sharing rides together",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Raatap - Let's Go Together, Share Memories",
    description:
      "Share rides with trusted community members. Save costs, build connections.",
  },
  alternates: {
    canonical: "https://raatap.com",
  },
};

// JSON-LD for homepage
const homePageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Raatap - Community Ride Sharing",
  description:
    "Join Raatap to share rides with trusted community members. Make your daily commute easier and cheaper.",
  url: "https://raatap.com",
  mainEntity: {
    "@type": "Service",
    name: "Raatap Ride Sharing",
    description:
      "Community-based ride coordination platform for verified institutional members.",
    provider: {
      "@type": "Organization",
      name: "Raatap",
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    serviceType: "Ride Sharing",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homePageSchema),
        }}
      />
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="w-full px-6 md:px-12 lg:px-20 py-16 md:py-24">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
            {/* Left Content */}
            <div className="flex-1 max-w-xl">
              {/* Main Heading */}
              <h1 className="text-5xl md:text-6xl lg:text-6xl font-semibold leading-tight tracking-tight text-[#1a1a1a]">
                Commute with
              </h1>
              <h2 className="text-5xl md:text-6xl lg:text-6xl font-semibold leading-tight tracking-tight text-[#6675FF] mt-2">
                Community
              </h2>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-3 mt-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-sm font-medium text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-[#6675FF]"></span>
                  Closed Community
                </span>
                <span className="text-sm font-medium text-gray-600">•</span>
                <span className="text-sm font-medium text-gray-600">
                  Daily Commute
                </span>
              </div>

              {/* Description */}
              <p className="mt-8 text-lg text-gray-700 leading-relaxed font-normal max-w-lg">
                Raatap helps verified members coordinate daily rides with people
                from community
              </p>

              {/* CTA Button */}
              <div className="flex items-center gap-4 mt-12">
                <Link
                  href="/signup"
                  className="group relative px-10 py-4 rounded-full font-semibold text-base transition-all duration-300 bg-[#6675FF] text-white hover:bg-[#5563e8] hover:shadow-lg hover:shadow-[#6675FF]/40 hover:-translate-y-1 overflow-hidden"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full"></span>
                  <span className="relative">Become Member</span>
                </Link>
              </div>
            </div>

            {/* Right Content - Illustration */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg lg:max-w-2xl">
                <Image
                  src="/landingpage_one.png"
                  alt="People sharing rides together - Raatap community ride sharing"
                  width={600}
                  height={500}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* How We Work Section */}
        <section className="w-full px-6 md:px-12 lg:px-20 py-8 md:py-12 bg-gray-50/50">
          <div className="max-w-7xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-semibold text-[#1a1a1a] mb-4">
                How We Work
              </h2>
            </div>

            {/* Three Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6">
              {/* Card 1: Verify Yourself */}
              <div className="flex flex-col items-center p-8 rounded-3xl border-2 border-[#6675FF]/30 bg-white hover:shadow-lg transition-shadow duration-300">
                {/* Image */}
                <div className="w-24 h-24 mb-6">
                  <Image
                    src="/trust.png"
                    alt="Verify Yourself"
                    width={96}
                    height={96}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold text-[#1a1a1a] mb-3 text-center">
                  Verify Yourself
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  Verify your account using your email address. Access will be
                  activated after admin verification.
                </p>
              </div>

              {/* Card 2: Set Your Commute */}
              <div className="flex flex-col items-center p-8 rounded-3xl border-2 border-[#6675FF]/30 bg-white hover:shadow-lg transition-shadow duration-300">
                {/* Image */}
                <div className="w-24 h-24 mb-6">
                  <Image
                    src="/cost_saving.png"
                    alt="Set Your Commute"
                    width={96}
                    height={96}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold text-[#1a1a1a] mb-3 text-center">
                  Set Your Commute
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  Share your regular commute information. It helps optimize
                  planning and improve efficiency.
                </p>
              </div>

              {/* Card 3: Form Your Pod */}
              <div className="flex flex-col items-center p-8 rounded-3xl border-2 border-[#6675FF]/30 bg-white hover:shadow-lg transition-shadow duration-300">
                {/* Image */}
                <div className="w-24 h-24 mb-6">
                  <Image
                    src="/community_support.png"
                    alt="Form Your Pod"
                    width={96}
                    height={96}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold text-[#1a1a1a] mb-3 text-center">
                  Form Your Pod
                </h3>
                <p className="text-gray-600 text-center leading-relaxed">
                  Join a pod to connect with a focused group, enable better
                  collaboration and smoother planning.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
