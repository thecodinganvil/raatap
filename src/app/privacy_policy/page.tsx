import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Raatap Privacy Policy - Learn how we collect, use, and protect your personal data. We respect your privacy and are committed to safeguarding your information.",
  keywords: [
    "Raatap privacy policy",
    "ride sharing privacy",
    "data protection India",
    "DPDP Act compliance",
    "user data privacy",
  ],
  openGraph: {
    title: "Privacy Policy - Raatap",
    description:
      "Learn how Raatap collects, uses, and protects your personal data.",
    url: "https://raatap.com/privacy_policy",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy - Raatap",
    description: "Learn how Raatap protects your personal data.",
  },
  alternates: {
    canonical: "https://raatap.com/privacy_policy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#fcfcfd]">
      <section className="w-full px-6 md:px-12 lg:px-20 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">

          {/* Page Header */}
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-[1px] w-8 bg-[#6675FF]"></div>
              <span className="text-[#6675FF] font-medium tracking-wider text-sm uppercase">Privacy Protection</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-[#1a1a1a] mb-6 tracking-tight">
              Privacy Policy
            </h1>
          </div>

          <div className="space-y-12">
            {/* Introduction */}
            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed font-medium italic">
                Raatap (&ldquo;Raatap&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, share, and safeguard your information.
              </p>
              <p className="text-gray-600 leading-relaxed mt-4">
                By using Raatap, you consent to the practices described in this Privacy Policy. This policy applies to all users accessing our platform across web and mobile services.
              </p>
            </div>

            <div className="grid gap-12 border-t border-gray-100 pt-12 text-gray-600">
              {/* 1. About Raatap */}
              <section id="about">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">1. ABOUT RAATAP</h2>
                <p className="leading-relaxed">
                  Raatap is a closed-community ride coordination platform operating in India. We act solely as a technology platform to enable coordination among verified users and do not provide transportation services.
                </p>
              </section>

              {/* 2. Information We Collect */}
              <section id="collection">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">2. INFORMATION WE COLLECT</h2>

                <div className="space-y-8">
                  <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
                    <h3 className="text-lg font-bold text-[#1a1a1a] mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#6675FF]"></span>
                      Personal Information
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-2 list-none text-sm">
                      <li className="flex gap-2"><span>•</span> Full name</li>
                      <li className="flex gap-2"><span>•</span> Phone number</li>
                      <li className="flex gap-2"><span>•</span> Email address</li>
                      <li className="flex gap-2"><span>•</span> Profile photograph</li>
                      <li className="flex gap-2"><span>•</span> Date of birth</li>
                      <li className="flex gap-2"><span>•</span> Institutional ID & verification details</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">Vehicle Information (Hosts Only)</h3>
                    <p className="mb-3">If you register as a Host, we may collect:</p>
                    <ul className="space-y-1 list-disc pl-5 marker:text-[#6675FF] text-sm md:columns-2">
                      <li>Driving license details</li>
                      <li>Vehicle details and photographs</li>
                      <li>Insurance and compliance information</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Location Information</h3>
                    <p className="text-sm text-blue-800 leading-relaxed mb-3">
                      We collect pickup and drop location details related to rides.
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                      We do not collect real-time live location tracking or background location data.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-[#1a1a1a] mb-2">Usage Information</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Ride and pod participation history</li>
                        <li>• Platform interactions and logs</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1a1a1a] mb-2">Payments</h4>
                      <p className="text-sm">Raatap does not store sensitive payment information. Transactions are handled by third-party providers.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Pod-Based Access */}
              <section id="visibility">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">3. POD-BASED ACCESS & DATA VISIBILITY</h2>
                <div className="space-y-4">
                  <p>Raatap operates a pod-based coordination system to protect your privacy:</p>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="mt-1 w-5 h-5 rounded-full bg-[#6675FF]/10 text-[#6675FF] flex items-center justify-center text-[10px] font-bold">1</div>
                      <p className="text-sm">Before confirmation, users only see limited info (name, photo, affiliation).</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="mt-1 w-5 h-5 rounded-full bg-[#6675FF]/10 text-[#6675FF] flex items-center justify-center text-[10px] font-bold">2</div>
                      <p className="text-sm">Contact details are restricted by default.</p>
                    </div>
                    <div className="flex gap-3 items-start">
                      <div className="mt-1 w-5 h-5 rounded-full bg-[#6675FF]/10 text-[#6675FF] flex items-center justify-center text-[10px] font-bold">3</div>
                      <p className="text-sm">Full contact info is shared only after pod confirmation/payment.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. How We Use */}
              <section id="usage">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">4. HOW WE USE YOUR INFORMATION</h2>
                <ul className="grid md:grid-cols-2 gap-x-8 gap-y-3 list-disc pl-5 marker:text-[#6675FF]">
                  <li>Verify identity and affiliation</li>
                  <li>Facilitate ride coordination</li>
                  <li>Enable secure feature access</li>
                  <li>Communicate service updates</li>
                  <li>Respond to support requests</li>
                  <li>Improve platform reliability</li>
                  <li>Prevent misuse and fraud</li>
                </ul>
              </section>

              {/* 5. Data Sharing */}
              <section id="sharing">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">5. DATA SHARING & DISCLOSURE</h2>
                <p className="mb-4 font-bold text-[#1a1a1a] text-lg">We do not sell personal data.</p>
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                  <p className="text-amber-800 text-sm leading-relaxed">
                    Information is shared only to enable ride coordination between Riders and Hosts, with Campus Admins for verification, or when required by law.
                  </p>
                </div>
              </section>

              {/* 6. Campus Admins */}
              <section id="moderation">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">6. CAMPUS ADMINS & MODERATION</h2>
                <p className="text-sm">Campus Admins and Moderators may have access to profiles, verification details, and ride history to maintain platform safety and integrity. They are bound by confidentiality guidelines.</p>
              </section>

              {/* 7. Data Retention */}
              <section id="retention">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">7. DATA RETENTION</h2>
                <p>We retain your data as long as your account is active, or for a reasonable period after deletion to meet legal, regulatory, or security requirements.</p>
              </section>

              {/* 8. Your Rights */}
              <section id="rights" className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/20">
                <h2 className="text-2xl font-bold text-emerald-900 mb-4">8. YOUR RIGHTS (INDIA DPDP ACT COMPLIANT)</h2>
                <p className="mb-4 text-emerald-800">You have the right to access, update, or request deletion of your information. You may also withdraw consent where applicable.</p>
                <a href="mailto:raatap1@gmail.com" className="text-emerald-700 font-bold underline decoration-2 underline-offset-4">
                  Request Data Action →
                </a>
              </section>

              {/* 9-11 General Sections */}
              <div className="grid md:grid-cols-3 gap-8 text-sm">
                <section>
                  <h3 className="font-bold text-[#1a1a1a] mb-2 uppercase tracking-tight">9. Security</h3>
                  <p>We use robust technical measures to protect your data, though no digital system is 100% secure.</p>
                </section>
                <section>
                  <h3 className="font-bold text-[#1a1a1a] mb-2 uppercase tracking-tight">10. Third-Party</h3>
                  <p>We are not responsible for the privacy practices of external links or services found on our platform.</p>
                </section>
                <section>
                  <h3 className="font-bold text-[#1a1a1a] mb-2 uppercase tracking-tight">11. Minors</h3>
                  <p>Raatap is intended for verified institutional members. We do not knowingly collect data from minors.</p>
                </section>
              </div>

              {/* 12. Changes */}
              <section id="changes">
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">12. CHANGES TO POLICY</h2>
                <p>Updates will be communicated through the platform. Continued use constitutes acceptance of the revised policy.</p>
              </section>

              {/* 13. Contact Information */}
              <section id="contact" className="bg-[#1a1a1a] text-white p-8 rounded-3xl mt-12 overflow-hidden relative">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-6 text-white uppercase tracking-wide">13. CONTACT INFORMATION</h2>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-gray-400 text-sm mb-4">For privacy-related inquiries, please reach out to our team:</p>
                      <div className="space-y-4">
                        <div>
                          <p className="font-bold text-white uppercase tracking-wider text-[10px] mb-1 opacity-50">Entity</p>
                          <p className="text-gray-300">Raatap (Proprietorship)</p>
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase tracking-wider text-[10px] mb-1 opacity-50">Location</p>
                          <p className="text-gray-300">Hyderabad, Telangana, India</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col justify-end">
                      <p className="font-bold text-white uppercase tracking-wider text-[10px] mb-1 opacity-50">Email Address</p>
                      <a href="mailto:raatap1@gmail.com" className="text-[#6675FF] text-2xl font-bold hover:text-[#5566FF] transition-all underline decoration-1 underline-offset-8">
                        raatap1@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#6675FF] opacity-10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              </section>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
