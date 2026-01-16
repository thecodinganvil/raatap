export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#f8f9fc]">
      <section className="w-full px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Page Title */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-medium text-[#171717] mb-2">
              Privacy Policy
            </h1>
            <div className="h-1 w-20 bg-[#6675FF] mt-4 rounded-full"></div>
          </div>
          
          <div className="space-y-10">
            {/* Introduction */}
            <section>
              <p className="text-gray-700 leading-relaxed italic">
                Raatap (&ldquo;Raatap&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, share, and safeguard your information when you access or use the Raatap platform (website, mobile application, or related services).
              </p>
              <p className="text-gray-700 leading-relaxed mt-4 font-medium">
                By using Raatap, you consent to the practices described in this Privacy Policy.
              </p>
            </section>

            {/* 1. About Raatap */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">1. ABOUT RAATAP</h2>
              <p className="text-gray-600 leading-relaxed">
                Raatap is a closed-community ride coordination platform operating in India. We act solely as a technology platform to enable coordination among verified users and do not provide transportation services.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">2. INFORMATION WE COLLECT</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-[#171717] mb-2">a. Personal Information</h3>
                  <p className="text-gray-600 mb-3">When you register or use Raatap, we may collect:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>Full name</li>
                    <li>Phone number</li>
                    <li>Email address</li>
                    <li>Profile photograph</li>
                    <li>Date of birth</li>
                    <li>Institutional or organizational ID and verification details</li>
                  </ul>
                  <p className="text-gray-600 mt-3 text-sm italic">This information is collected to verify users as bona fide members of an institute or organization and to maintain platform integrity.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#171717] mb-2">b. Vehicle Information (Hosts Only)</h3>
                  <p className="text-gray-600 mb-3">If you register as a Host, we may collect:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>Driving license details</li>
                    <li>Vehicle details and photographs</li>
                    <li>Insurance and compliance information</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#171717] mb-2">c. Location Information</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>Pickup and drop location details related to rides</li>
                    <li>Ride history linked to locations</li>
                  </ul>
                  <p className="text-gray-600 mt-2 font-medium">We do not collect real-time live location tracking and do not collect background location data.</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#171717] mb-2">d. Usage Information</h3>
                  <p className="text-gray-600 mb-3">We may collect:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                    <li>Ride and pod participation history</li>
                    <li>Platform interactions and activity logs</li>
                    <li>Basic operational data necessary to maintain platform functionality</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#171717] mb-2">e. Payments</h3>
                  <p className="text-gray-600">Raatap does not store sensitive payment information. If payments are enabled, they are processed through third-party payment service providers.</p>
                </div>
              </div>
            </section>

            {/* 3. Pod-Based Access */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">3. POD-BASED ACCESS & DATA VISIBILITY</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Raatap operates a pod-based coordination system.</p>
                <p>Before pod confirmation, users may view limited profile information of other pod members (such as name, profile photo, and institutional affiliation).</p>
                <p>Contact details and direct communication information are restricted by default.</p>
                <p>Full contact information of pod members is shared only after pod confirmation, which may require completion of a one-time payment, as defined by the platform.</p>
                <p className="font-medium">This access control is designed to protect user privacy and prevent misuse of personal data.</p>
              </div>
            </section>

            {/* 4. How We Use */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">4. HOW WE USE YOUR INFORMATION</h2>
              <p className="text-gray-600 mb-3">We use collected information to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
                <li>Verify user identity and institutional affiliation</li>
                <li>Facilitate pod formation and ride coordination</li>
                <li>Enable secure access to platform features</li>
                <li>Communicate service-related updates</li>
                <li>Respond to user support requests</li>
                <li>Improve platform safety, reliability, and user experience</li>
                <li>Prevent misuse, fraud, and policy violations</li>
              </ul>
              <p className="text-gray-600 mt-3">Promotional communications, if introduced, will be subject to user consent and applicable laws.</p>
            </section>

            {/* 5. Data Sharing */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">5. DATA SHARING & DISCLOSURE</h2>
              <p className="text-gray-600 mb-3 font-medium">We do not sell personal data.</p>
              <p className="text-gray-600 mb-3">We may share information:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
                <li>Between Riders and Hosts to enable ride coordination</li>
                <li>With Campus Admins / Moderators for verification and moderation</li>
                <li>With trusted service providers supporting platform operations</li>
                <li>If required by law, regulation, or legal process</li>
                <li>In connection with a business transfer, restructuring, or acquisition</li>
              </ul>
              <p className="text-gray-600 mt-3">All sharing is limited to what is necessary for the stated purpose.</p>
            </section>

            {/* 6. Campus Admins */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">6. CAMPUS ADMINS & MODERATION</h2>
              <p className="text-gray-600 mb-3">Campus Admins and Moderators may have access to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                <li>User profiles</li>
                <li>Verification details</li>
                <li>Ride and pod participation history</li>
                <li>Contact information, where required for moderation</li>
              </ul>
              <p className="text-gray-600 mt-3">They act under platform guidelines and are expected to maintain confidentiality.</p>
            </section>

            {/* 7. Data Retention */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">7. DATA RETENTION</h2>
              <p className="text-gray-600">We retain personal data for as long as your account remains active, or for a reasonable period after account deletion to meet legal, regulatory, security, or operational requirements. Retention duration may vary depending on the type of data and applicable obligations.</p>
            </section>

            {/* 8. Your Rights */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">8. YOUR RIGHTS (INDIA DPDP ACT COMPLIANT)</h2>
              <p className="text-gray-600 mb-3">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
                <li>Access and update your personal information</li>
                <li>Request deletion of your account</li>
                <li>Withdraw consent where applicable</li>
              </ul>
              <p className="text-gray-600 mt-3">Certain information may be retained where required by law or for legitimate purposes.</p>
              <p className="text-gray-600 mt-2">Requests can be submitted at: <a href="mailto:raatap1@gmail.com" className="text-[#6675FF] hover:underline">raatap1@gmail.com</a></p>
            </section>

            {/* 9. Data Security */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">9. DATA SECURITY</h2>
              <p className="text-gray-600">We implement reasonable technical and organizational measures to protect your data against unauthorized access, loss, or misuse. However, no digital system is completely secure. Users are responsible for maintaining the confidentiality of their account credentials.</p>
            </section>

            {/* 10. Third-Party Links */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">10. THIRD-PARTY LINKS & SERVICES</h2>
              <p className="text-gray-600">Raatap may include links to third-party services. We are not responsible for their privacy practices, and users should review third-party policies independently.</p>
            </section>

            {/* 11. Children's Privacy */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">11. CHILDREN’S PRIVACY</h2>
              <p className="text-gray-600">Raatap is intended for users who are legally eligible to be members of educational institutions or organizations. We do not knowingly collect personal data from minors outside permitted usage.</p>
            </section>

            {/* 12. Changes */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">12. CHANGES TO THIS PRIVACY POLICY</h2>
              <p className="text-gray-600">We may update this Privacy Policy from time to time. Updates will be communicated through the platform or other appropriate means. Continued use of Raatap constitutes acceptance of the revised policy.</p>
            </section>

            {/* 13. Contact */}
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-semibold text-[#171717] mb-4">13. CONTACT INFORMATION</h2>
              <div className="text-gray-600 space-y-1">
                <p className="font-medium text-[#171717]">Raatap (Proprietorship)</p>
                <p>Hyderabad, Telangana, India</p>
                <p className="flex items-center gap-2 mt-2">
                  <span className="text-lg">📧</span>
                  <a href="mailto:raatap1@gmail.com" className="text-[#6675FF] hover:underline">raatap1@gmail.com</a>
                </p>
              </div>
            </section>
          </div>
          
        </div>
      </section>
    </main>
  );
}

