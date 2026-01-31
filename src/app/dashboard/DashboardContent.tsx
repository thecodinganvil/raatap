"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import LocationInput from "@/components/LocationInput";

interface FormData {
  // Step 1 fields
  full_name: string;
  phone_number: string;
  age: string;
  gender: string;
  institution: string;
  from_location: string;
  to_location: string;
  leave_home_time: string;
  leave_college_time: string;
  days_of_commute: string[];

  // Step 2 fields
  prefer_hosting: boolean;
  prefer_taking_ride: boolean;
  vehicle_type: string; // 2_wheeler, 4_wheeler
  comfortable_with: string; // male, female, both
  agreed_to_terms: boolean;
}

const COLLEGES = [
  "CBIT",
  "MGIT",
  "VNRVJIET",
  "VNR Vignana Jyothi Institute of Engineering and Technology",
  "CVR College of Engineering",
  "Chaitanya Bharathi Institute of Technology",
  "Gokaraju Rangaraju Institute of Engineering and Technology",
  "Other",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // OTP Verification states
  const [verificationStep, setVerificationStep] = useState<"otp" | null>(null);
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    phone_number: "",
    age: "",
    gender: "",
    institution: "",
    from_location: "",
    to_location: "",
    leave_home_time: "",
    leave_college_time: "",
    days_of_commute: [],
    prefer_hosting: false,
    prefer_taking_ride: false,
    vehicle_type: "",
    comfortable_with: "",
    agreed_to_terms: false,
  });

  useEffect(() => {
    const checkUser = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      // Small delay to allow cookies to sync after OAuth redirect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use getUser() which validates with the server - more reliable after OAuth
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      console.log("Dashboard checkUser - authUser:", authUser?.email, "error:", authError?.message);

      if (authUser) {
        setUser(authUser);
        
        // Check if user has already submitted
        const { data: existingEntry } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (existingEntry) {
          setSubmitted(true);
        } else if (authUser.user_metadata?.full_name) {
          setFormData((prev) => ({
            ...prev,
            full_name: authUser.user_metadata.full_name,
          }));
        }
        setLoading(false);
        return;
      }

      // Fallback: try getSession
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      console.log("Dashboard checkUser - session:", session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        
        // Check if user has already submitted
        const { data: existingEntry } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (existingEntry) {
          setSubmitted(true);
        } else if (session.user.user_metadata?.full_name) {
          setFormData((prev) => ({
            ...prev,
            full_name: session.user.user_metadata.full_name,
          }));
        }
        setLoading(false);
        return;
      }

      // No user found, redirect to login
      console.log("No session found, redirecting to login");
      router.push("/signup");
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Dashboard auth state change:", event, session?.user?.email);
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        router.push("/signup");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleNext = () => {
    // Validate step 1 fields
    const newErrors: Record<string, string> = {};

    if (!formData.full_name) newErrors.full_name = "Full name is required";
    if (!formData.phone_number)
      newErrors.phone_number = "Phone number is required";
    else if (!/^[0-9]{10}$/.test(formData.phone_number))
      newErrors.phone_number = "Enter a valid 10-digit number";
    if (!formData.age) newErrors.age = "Age is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.institution)
      newErrors.institution = "Institution is required";
    if (!formData.from_location)
      newErrors.from_location = "Start location is required";
    if (!formData.to_location)
      newErrors.to_location = "Destination is required";
    if (!formData.leave_home_time)
      newErrors.leave_home_time = "Leave home time is required";
    if (!formData.leave_college_time)
      newErrors.leave_college_time = "Leave college time is required";
    if (formData.days_of_commute.length === 0)
      newErrors.days_of_commute = "Select at least one day";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate step 2
    const newErrors: Record<string, string> = {};

    if (!formData.prefer_hosting && !formData.prefer_taking_ride) {
      newErrors.preference = "Select at least one preference";
    }
    if (!formData.vehicle_type)
      newErrors.vehicle_type = "Select a vehicle type";
    if (!formData.comfortable_with)
      newErrors.comfortable_with = "Select who you're comfortable with";
    if (!formData.agreed_to_terms)
      newErrors.agreed_to_terms = "You must agree to continue";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Send OTP to institutional email
    if (!institutionalEmail) {
      setErrors({
        ...errors,
        institutional_email: "Institutional email is required",
      });
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: institutionalEmail,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.error || "Failed to send OTP");
        setOtpLoading(false);
        return;
      }

      setVerificationStep("otp");
      setResendTimer(60);
    } catch (err) {
      console.error("Send OTP error:", err);
      setOtpError("Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setOtpLoading(true);
    setOtpError("");

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: institutionalEmail,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.error || "Failed to resend OTP");
      } else {
        setResendTimer(60);
        setOtpError("");
      }
    } catch (err) {
      setOtpError("Failed to resend OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }

    setOtpLoading(true);
    setOtpError("");

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp: otpCode,
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.error || "Invalid OTP");
        setOtpLoading(false);
        return;
      }

      // OTP verified, now save the profile
      setSubmitting(true);
      const { error: insertError } = await supabase.from("profiles").upsert(
        {
          id: user?.id,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          age: parseInt(formData.age),
          gender: formData.gender,
          institution: formData.institution,
          institutional_email: institutionalEmail,
          from_location: formData.from_location,
          to_location: formData.to_location,
          leave_home_time: formData.leave_home_time,
          leave_college_time: formData.leave_college_time,
          days_of_commute: formData.days_of_commute,
          prefer_hosting: formData.prefer_hosting,
          prefer_taking_ride: formData.prefer_taking_ride,
          vehicle_type: formData.vehicle_type,
          comfortable_with: formData.comfortable_with,
          agreed_to_terms: formData.agreed_to_terms,
          email_verified: true,
        },
        { onConflict: "id" },
      );

      if (insertError) {
        console.error("Error saving profile:", insertError);
        console.error("Insert error details:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        setOtpError(
          `Failed to save profile: ${insertError.message}. Check console for details.`,
        );
        return;
      }

      console.log("Profile saved successfully!");
      setOtpLoading(false);
      setSubmitting(false);
      setVerificationStep(null); // Reset verification step to allow submitted screen to show
      setSubmitted(true);
      return; // Exit early after success
    } catch (err) {
      console.error("Catch block error:", err);
      setOtpError("Failed to verify OTP. Please try again.");
      setOtpLoading(false);
      setSubmitting(false);
    }
  };

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const toggleArrayValue = (field: "days_of_commute", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#6675FF]/20"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  // Email OTP Verification Screen
  if (verificationStep === "otp") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-white to-[#e8ebff] flex items-center justify-center px-4 py-12">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 border border-white/50 p-8 md:p-10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#6675FF]/10 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#6675FF]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-[#171717] mb-2">
                Verify Your Email
              </h2>
              <p className="text-gray-500 text-sm">
                We sent a 6-digit code to{" "}
                <span className="font-medium text-[#6675FF]">
                  {institutionalEmail}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                  Enter 6-digit code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 6);
                    setOtpCode(value);
                    setOtpError("");
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:ring-4 focus:ring-[#6675FF]/10 transition-all text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
              </div>

              {otpError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{otpError}</p>
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={otpLoading || otpCode.length !== 6}
                className="w-full py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-[#6675FF]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {otpLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Verify & Complete"
                )}
              </button>

              <div className="flex flex-col gap-2">
                {resendTimer > 0 ? (
                  <p className="text-center text-sm text-gray-500">
                    Resend OTP in {resendTimer}s
                  </p>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={otpLoading}
                    className="w-full py-2 text-[#6675FF] font-medium hover:underline disabled:opacity-50"
                  >
                    Resend OTP
                  </button>
                )}

                <button
                  onClick={() => {
                    setVerificationStep(null);
                    setOtpCode("");
                    setOtpError("");
                  }}
                  disabled={otpLoading}
                  className="w-full py-2 text-gray-500 font-medium hover:text-[#6675FF] transition-colors disabled:opacity-50"
                >
                  Back to form
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-white to-[#e8ebff] flex items-center justify-center px-4 py-8">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 p-8 md:p-10 border border-white/50 max-w-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#6675FF] to-[#8892ff] flex items-center justify-center animate-bounce">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-[#171717] mb-3">
            Verification Complete!
          </h1>
          <p className="text-gray-500 mb-2 text-lg">
            Welcome aboard, {formData.full_name}!
          </p>
          <p className="text-sm text-gray-400">
            Your profile has been created successfully. We&apos;ll match you
            with ride partners soon.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-white to-[#e8ebff] flex items-center justify-center px-4 py-12">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Title */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-[#6675FF] mb-2">
            Verify
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Complete your profile to get started
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 border border-white/50 p-5 sm:p-8 md:p-12">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div
              className={`w-3 h-3 rounded-full transition-all ${currentStep === 1 ? "bg-[#6675FF] w-8" : "bg-gray-300"}`}
            ></div>
            <div
              className={`w-3 h-3 rounded-full transition-all ${currentStep === 2 ? "bg-[#6675FF] w-8" : "bg-gray-300"}`}
            ></div>
          </div>

          {/* Back Button & Subtitle */}
          <div className="flex items-center gap-3 mb-6">
            {currentStep === 2 && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-medium text-gray-700 flex-1">
              {currentStep === 1
                ? "Complete your profile for membership"
                : "Set your preferences"}
            </h2>
          </div>

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }));
                    if (errors.full_name)
                      setErrors((prev) => ({ ...prev, full_name: "" }));
                  }}
                  className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.full_name ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                  required
                />
                {errors.full_name && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter 10-digit phone number"
                  value={formData.phone_number}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setFormData((prev) => ({
                      ...prev,
                      phone_number: value,
                    }));
                    if (errors.phone_number)
                      setErrors((prev) => ({ ...prev, phone_number: "" }));
                  }}
                  className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.phone_number ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                  required
                />
                {errors.phone_number && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {errors.phone_number}
                  </p>
                )}
              </div>

              {/* Age & Gender Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                    Age
                  </label>
                  <input
                    type="number"
                    placeholder="Age"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, age: e.target.value }));
                      if (errors.age)
                        setErrors((prev) => ({ ...prev, age: "" }));
                    }}
                    className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.age ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                    required
                  />
                  {errors.age && (
                    <p className="text-red-500 text-xs mt-1 ml-1">
                      {errors.age}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                    Gender
                  </label>
                  <div className="relative">
                    <select
                      value={formData.gender}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          gender: e.target.value,
                        }));
                        if (errors.gender)
                          setErrors((prev) => ({ ...prev, gender: "" }));
                      }}
                      className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all appearance-none cursor-pointer ${errors.gender ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                      required
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  {errors.gender && (
                    <p className="text-red-500 text-xs mt-1 ml-1">
                      {errors.gender}
                    </p>
                  )}
                </div>
              </div>

              {/* Institution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                  Institution
                </label>
                <div className="relative">
                  <select
                    value={formData.institution}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        institution: e.target.value,
                      }));
                      if (errors.institution)
                        setErrors((prev) => ({ ...prev, institution: "" }));
                    }}
                    className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all appearance-none cursor-pointer ${errors.institution ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                    required
                  >
                    <option value="">Select your institution</option>
                    {COLLEGES.map((college) => (
                      <option key={college} value={college}>
                        {college}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                {errors.institution && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {errors.institution}
                  </p>
                )}
              </div>

              {/* Institutional Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                  Institutional Email
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (We'll verify this)
                  </span>
                </label>
                <input
                  type="email"
                  placeholder="e.g., yourname@cbit.ac.in"
                  value={institutionalEmail}
                  onChange={(e) => {
                    setInstitutionalEmail(e.target.value);
                    if (errors.institutional_email)
                      setErrors((prev) => ({
                        ...prev,
                        institutional_email: "",
                      }));
                  }}
                  className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.institutional_email ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                  required
                />
                {errors.institutional_email && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {errors.institutional_email}
                  </p>
                )}
              </div>

              {/* Route Section */}
              <div className="bg-gradient-to-r from-[#6675FF]/5 to-transparent rounded-2xl p-5 border border-[#6675FF]/20">
                <h3 className="text-sm font-semibold text-[#6675FF] mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Your Daily Route
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">
                      From (Home/Start Location)
                    </label>
                    <LocationInput
                      value={formData.from_location}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          from_location: value,
                        }));
                        if (errors.from_location)
                          setErrors((prev) => ({ ...prev, from_location: "" }));
                      }}
                      placeholder="e.g., Kukatpally, Hyderabad"
                      error={errors.from_location}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">
                      To (College/Destination)
                    </label>
                    <LocationInput
                      value={formData.to_location}
                      onChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          to_location: value,
                        }));
                        if (errors.to_location)
                          setErrors((prev) => ({ ...prev, to_location: "" }));
                      }}
                      placeholder="e.g., CBIT, Gandipet"
                      error={errors.to_location}
                    />
                  </div>
                </div>
              </div>

              {/* Time Windows */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                    Leave Home
                  </label>
                  <input
                    type="time"
                    value={formData.leave_home_time}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        leave_home_time: e.target.value,
                      }));
                      if (errors.leave_home_time)
                        setErrors((prev) => ({ ...prev, leave_home_time: "" }));
                    }}
                    className={`w-full px-4 py-3.5 border-2 rounded-2xl bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${errors.leave_home_time ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                    required
                  />
                  {errors.leave_home_time && (
                    <p className="text-red-500 text-xs mt-1 ml-1">
                      {errors.leave_home_time}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                    Leave College
                  </label>
                  <input
                    type="time"
                    value={formData.leave_college_time}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        leave_college_time: e.target.value,
                      }));
                      if (errors.leave_college_time)
                        setErrors((prev) => ({
                          ...prev,
                          leave_college_time: "",
                        }));
                    }}
                    className={`w-full px-4 py-3.5 border-2 rounded-2xl bg-white text-gray-800 focus:outline-none focus:ring-4 transition-all ${errors.leave_college_time ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                    required
                  />
                  {errors.leave_college_time && (
                    <p className="text-red-500 text-xs mt-1 ml-1">
                      {errors.leave_college_time}
                    </p>
                  )}
                </div>
              </div>

              {/* Days of Commute */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 ml-1">
                  Days of Commute
                </label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {DAYS.map((day) => (
                    <label key={day} className="relative cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.days_of_commute.includes(day)}
                        onChange={() =>
                          toggleArrayValue("days_of_commute", day)
                        }
                        className="peer sr-only"
                      />
                      <div
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 border-2 rounded-xl bg-white text-center text-xs sm:text-sm font-medium text-gray-600 transition-all peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF] peer-checked:text-white hover:border-[#6675FF]/50 min-w-[52px] ${errors.days_of_commute ? "border-red-300" : "border-gray-200"}`}
                      >
                        {day.slice(0, 3)}
                      </div>
                    </label>
                  ))}
                </div>
                {errors.days_of_commute && (
                  <p className="text-red-500 text-xs mt-2 text-center">
                    {errors.days_of_commute}
                  </p>
                )}
              </div>

              <button
                onClick={handleNext}
                className="w-full mt-6 py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-[#6675FF]/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* You prefer */}
              <div
                className={`bg-gradient-to-r from-[#6675FF]/5 to-transparent rounded-2xl p-5 border ${errors.preference ? "border-red-300" : "border-[#6675FF]/20"}`}
              >
                <label className="block text-sm font-semibold text-[#6675FF] mb-4">
                  You prefer
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-white/50 transition-colors group">
                    <input
                      type="checkbox"
                      checked={formData.prefer_hosting}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          prefer_hosting: e.target.checked,
                        }));
                        if (errors.preference)
                          setErrors((prev) => ({ ...prev, preference: "" }));
                      }}
                      className="w-5 h-5 text-[#6675FF] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#6675FF]/50"
                    />
                    <span className="text-gray-700 font-medium">
                      Hosting (I have a vehicle)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-white/50 transition-colors group">
                    <input
                      type="checkbox"
                      checked={formData.prefer_taking_ride}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          prefer_taking_ride: e.target.checked,
                        }));
                        if (errors.preference)
                          setErrors((prev) => ({ ...prev, preference: "" }));
                      }}
                      className="w-5 h-5 text-[#6675FF] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#6675FF]/50"
                    />
                    <span className="text-gray-700 font-medium">
                      Taking ride (I need a ride)
                    </span>
                  </label>
                </div>
                {errors.preference && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.preference}
                  </p>
                )}
              </div>

              {/* Vehicle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Vehicle Type
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <label className="relative cursor-pointer group">
                    <input
                      type="radio"
                      name="vehicle_type"
                      value="2_wheeler"
                      checked={formData.vehicle_type === "2_wheeler"}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          vehicle_type: e.target.value,
                        }));
                        if (errors.vehicle_type)
                          setErrors((prev) => ({ ...prev, vehicle_type: "" }));
                      }}
                      className="peer sr-only"
                    />
                    <div
                      className={`p-3 sm:p-4 border-2 rounded-2xl bg-white text-center transition-all peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF]/5 peer-checked:shadow-lg peer-checked:shadow-[#6675FF]/20 hover:border-[#6675FF]/50 ${errors.vehicle_type ? "border-red-300" : "border-gray-200"}`}
                    >
                      <div className="text-xl sm:text-2xl mb-1 sm:mb-2 text-[#6675FF]">
                        2W
                      </div>
                      <span className="text-gray-700 font-medium text-xs sm:text-sm">
                        2 Wheeler
                      </span>
                    </div>
                  </label>

                  <label className="relative cursor-pointer group">
                    <input
                      type="radio"
                      name="vehicle_type"
                      value="4_wheeler"
                      checked={formData.vehicle_type === "4_wheeler"}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          vehicle_type: e.target.value,
                        }));
                        if (errors.vehicle_type)
                          setErrors((prev) => ({ ...prev, vehicle_type: "" }));
                      }}
                      className="peer sr-only"
                    />
                    <div
                      className={`p-3 sm:p-4 border-2 rounded-2xl bg-white text-center transition-all peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF]/5 peer-checked:shadow-lg peer-checked:shadow-[#6675FF]/20 hover:border-[#6675FF]/50 ${errors.vehicle_type ? "border-red-300" : "border-gray-200"}`}
                    >
                      <div className="text-xl sm:text-2xl mb-1 sm:mb-2 text-[#6675FF]">
                        4W
                      </div>
                      <span className="text-gray-700 font-medium text-xs sm:text-sm">
                        4 Wheeler
                      </span>
                    </div>
                  </label>
                </div>
                {errors.vehicle_type && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.vehicle_type}
                  </p>
                )}
              </div>

              {/* Comfortable with */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Comfortable riding with
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <label className="relative cursor-pointer flex-1 min-w-[80px]">
                    <input
                      type="radio"
                      name="comfortable_with"
                      value="male"
                      checked={formData.comfortable_with === "male"}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          comfortable_with: e.target.value,
                        }));
                        if (errors.comfortable_with)
                          setErrors((prev) => ({
                            ...prev,
                            comfortable_with: "",
                          }));
                      }}
                      className="peer sr-only"
                    />
                    <div
                      className={`p-2.5 sm:p-3 border-2 rounded-xl bg-white text-center text-xs sm:text-sm font-medium text-gray-700 transition-all peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF] peer-checked:text-white hover:border-[#6675FF]/50 ${errors.comfortable_with ? "border-red-300" : "border-gray-200"}`}
                    >
                      Male
                    </div>
                  </label>

                  <label className="relative cursor-pointer flex-1 min-w-[80px]">
                    <input
                      type="radio"
                      name="comfortable_with"
                      value="female"
                      checked={formData.comfortable_with === "female"}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          comfortable_with: e.target.value,
                        }));
                        if (errors.comfortable_with)
                          setErrors((prev) => ({
                            ...prev,
                            comfortable_with: "",
                          }));
                      }}
                      className="peer sr-only"
                    />
                    <div
                      className={`p-2.5 sm:p-3 border-2 rounded-xl bg-white text-center text-xs sm:text-sm font-medium text-gray-700 transition-all peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF] peer-checked:text-white hover:border-[#6675FF]/50 ${errors.comfortable_with ? "border-red-300" : "border-gray-200"}`}
                    >
                      Female
                    </div>
                  </label>

                  <label className="relative cursor-pointer flex-1 min-w-[80px]">
                    <input
                      type="radio"
                      name="comfortable_with"
                      value="both"
                      checked={formData.comfortable_with === "both"}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          comfortable_with: e.target.value,
                        }));
                        if (errors.comfortable_with)
                          setErrors((prev) => ({
                            ...prev,
                            comfortable_with: "",
                          }));
                      }}
                      className="peer sr-only"
                    />
                    <div
                      className={`p-2.5 sm:p-3 border-2 rounded-xl bg-white text-center text-xs sm:text-sm font-medium text-gray-700 transition-all peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF] peer-checked:text-white hover:border-[#6675FF]/50 ${errors.comfortable_with ? "border-red-300" : "border-gray-200"}`}
                    >
                      Both
                    </div>
                  </label>
                </div>
                {errors.comfortable_with && (
                  <p className="text-red-500 text-xs mt-2">
                    {errors.comfortable_with}
                  </p>
                )}
              </div>

              {/* Agreement checkbox */}
              <div>
                <label
                  className={`flex items-start gap-3 cursor-pointer p-4 rounded-2xl bg-amber-50 border-2 hover:bg-amber-100/50 transition-colors ${errors.agreed_to_terms ? "border-red-300" : "border-amber-200/50"}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.agreed_to_terms}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        agreed_to_terms: e.target.checked,
                      }));
                      if (errors.agreed_to_terms)
                        setErrors((prev) => ({ ...prev, agreed_to_terms: "" }));
                    }}
                    className="w-5 h-5 text-[#6675FF] border-2 border-gray-300 rounded mt-0.5 focus:ring-2 focus:ring-[#6675FF]/50"
                    required
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I agree to commute with my friends and follow community
                    guidelines
                  </span>
                </label>
                {errors.agreed_to_terms && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {errors.agreed_to_terms}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-[#6675FF]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Complete Verification"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
