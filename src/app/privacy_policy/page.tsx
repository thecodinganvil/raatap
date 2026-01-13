export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#f8f9fc]">
      <section className="w-full px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Page Title */}
          <h1 className="text-3xl md:text-4xl font-medium text-[#171717] mb-12 underline underline-offset-8 decoration-2">
            Privacy Policy
          </h1>
          
          {/* Paragraph 1 - Data Collection */}
          <p className="text-gray-600 leading-relaxed mb-8">
            We value your privacy and are committed to protecting your personal information. When you use our ride-sharing community platform, we may collect basic details such as your name, contact information, profile photo, and location data to enable ride matching and communication between users. We may also collect limited device and usage information to improve platform performance, safety, and reliability.
          </p>
          
          {/* Paragraph 2 - Data Usage */}
          <p className="text-gray-600 leading-relaxed mb-8">
            The information we collect is used solely to provide and enhance our services, including connecting riders with ride providers, enabling navigation and trip coordination, sending service-related notifications, and maintaining a safe and trusted community. Location data is used only during ride search and active trips and is not continuously tracked when the platform is not in use.
          </p>
          
          {/* Paragraph 3 - Data Sharing */}
          <p className="text-gray-600 leading-relaxed mb-8">
            We do not sell or rent your personal data to third parties. Your information is shared only with matched users for ride coordination or with trusted service providers who assist us with hosting, mapping, or technical support, under strict confidentiality obligations. Information may also be disclosed if required by law or to protect the safety and rights of users.
          </p>
          
          {/* Paragraph 4 - Security & Rights */}
          <p className="text-gray-600 leading-relaxed mb-8">
            We take reasonable security measures to protect your data and retain it only as long as necessary for operational, legal, or safety purposes. Users have the right to access, update, or request deletion of their personal information. Our services are intended for users aged 18 years and above, and we do not knowingly collect data from minors.
          </p>
          
        </div>
      </section>
    </main>
  );
}
