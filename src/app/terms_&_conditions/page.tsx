export default function TermsAndConditions() {
  return (
    <main className="min-h-screen bg-[#f8f9fc]">
      <section className="w-full px-6 md:px-12 lg:px-20 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Page Title */}
          <h1 className="text-3xl md:text-4xl font-medium text-[#171717] mb-12">
            Terms & Condition
          </h1>
          
          {/* Platform Role */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#171717] mb-2">Platform Role</h2>
            <p className="text-gray-600 leading-relaxed">
              This website acts only as a ride-sharing community platform. We do not provide transportation services, own vehicles, or employ drivers.
            </p>
          </div>
          
          {/* User Responsibility */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#171717] mb-2">User Responsibility</h2>
            <p className="text-gray-600 leading-relaxed">
              All rides are arranged directly between users. Drivers and passengers are solely responsible for their conduct, safety, and agreements.
            </p>
          </div>
          
          {/* Eligibility */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#171717] mb-2">Eligibility</h2>
            <p className="text-gray-600 leading-relaxed">
              Drivers must hold a valid driving license, vehicle registration, and insurance. All users must provide accurate and truthful information.
            </p>
          </div>
          
          {/* Cost Sharing */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#171717] mb-2">Cost Sharing</h2>
            <p className="text-gray-600 leading-relaxed">
              Any payments between users are strictly for cost sharing. The platform does not manage or guarantee payments.
            </p>
          </div>
          
          {/* Safety & Conduct */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#171717] mb-2">Safety & Conduct</h2>
            <p className="text-gray-600 leading-relaxed">
              Illegal, unsafe, abusive, or inappropriate behavior is strictly prohibited and may result in account suspension or removal.
            </p>
          </div>
          
          {/* Termination */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#171717] mb-2">Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to suspend or terminate access for violations of these Terms.
            </p>
          </div>
          
          {/* Changes to Terms */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-[#171717] mb-2">Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms may be updated at any time. Continued use of the website implies acceptance of the revised Terms.
            </p>
          </div>
          
        </div>
      </section>
    </main>
  );
}
