export default function TermsAndConditions() {
  return (
    <main className="min-h-screen bg-[#f8f9fc]">
      <section className="w-full px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Page Title */}
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-medium text-[#171717] mb-2">
              Terms & Conditions
            </h1>
            <div className="h-1 w-20 bg-[#6675FF] mt-4 rounded-full"></div>
          </div>
          
          <div className="space-y-10">
            {/* Introduction */}
            <section>
              <p className="text-gray-700 leading-relaxed italic">
                By accessing or using the Raatap platform, you agree to be bound by these Terms and Conditions. These terms govern your use of our website, mobile application, and related coordination services.
              </p>
            </section>

            {/* 1. Platform Role */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">1. PLATFORM ROLE & SERVICES</h2>
              <p className="text-gray-600 leading-relaxed">
                Raatap acts solely as a technology platform to facilitate ride coordination among verified community members. We do not provide transportation services, we do not own or operate vehicles, and we do not employ drivers. All ride arrangements are made directly between users.
              </p>
            </section>

            {/* 2. User Responsibility */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">2. USER RESPONSIBILITY</h2>
              <p className="text-gray-600 leading-relaxed">
                As a user of Raatap, you are solely responsible for your conduct, safety, and any agreements made with other users. Raatap does not verify the mechanical condition of any vehicle or the driving ability of any host. Users are encouraged to exercise caution and common sense when coordinating rides.
              </p>
            </section>

            {/* 3. Eligibility & Verification */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">3. ELIGIBILITY & VERIFICATION</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
                <li>Users must be legally eligible to be members of their respective educational institutions or organizations.</li>
                <li>Hosts (Drivers) must hold a valid driving license, current vehicle registration, and active insurance coverage as required by Indian law.</li>
                <li>All users must provide accurate, truthful, and up-to-date information during registration and verification.</li>
              </ul>
            </section>

            {/* 4. Cost Sharing */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">4. COST SHARING</h2>
              <p className="text-gray-600 leading-relaxed">
                Any payments or cost-sharing arrangements between users are strictly handled between the parties involved. Raatap facilitates coordination but does not manage, guarantee, or take responsibility for payments between users. These payments should be limited to actual cost sharing (fuel, tolls, maintenance) to comply with local regulations.
              </p>
            </section>

            {/* 5. Safety & Conduct */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">5. SAFETY & CODE OF CONDUCT</h2>
              <p className="text-gray-600 mb-3">To maintain a trusted community, users must adhere to strict safety and conduct guidelines:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-2">
                <li>Illegal, unsafe, abusive, or inappropriate behavior is strictly prohibited.</li>
                <li>Users must respect the privacy and property of others.</li>
                <li>Any violation of safety protocols or community guidelines may lead to immediate account suspension or permanent removal.</li>
              </ul>
            </section>

            {/* 6. Limitation of Liability */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">6. LIMITATION OF LIABILITY</h2>
              <p className="text-gray-600 leading-relaxed">
                Raatap (and its proprietor) shall not be liable for any damages, losses, or disputes arising from ride coordination, user interactions, or transportation incidents. Use of the platform is at the user&apos;s own risk.
              </p>
            </section>

            {/* 7. Termination of Access */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">7. TERMINATION</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to suspend or terminate access to the platform at our sole discretion, without prior notice, for any user who violates these Terms and Conditions or the spirit of the Raatap community.
              </p>
            </section>

            {/* 8. Changes to Terms */}
            <section>
              <h2 className="text-xl font-semibold text-[#171717] mb-4">8. CHANGES TO THESE TERMS</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update these Terms & Conditions from time to time to reflect changes in our services or legal obligations. Continued use of the platform after updates are posted constitutes acceptance of the revised Terms.
              </p>
            </section>

            {/* Contact Section */}
            <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-semibold text-[#171717] mb-4">Contact Information</h2>
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

