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
  student_id: string;
  institution: string;
  from_location: string;
  landmark: string;
  to_location: string;
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  leave_home_time: string;
  leave_college_time: string;
  days_of_commute: string[];

  // Step 2 fields
  prefer_hosting: boolean;
  prefer_taking_ride: boolean;
  vehicle_type: string; // 2_wheeler, 4_wheeler
  comfortable_with: string; // male, female, both
  agreed_to_terms: boolean;
  agreed_to_policies: boolean;
}

export const COLLEGES = [
  "CBIT",
  "MGIT",
  "VNRVJIET",
  "VNR Vignana Jyothi Institute of Engineering and Technology",
  "CVR College of Engineering",
  "Chaitanya deemed university",
  "Gokaraju Rangaraju Institute of Engineering and Technology",
  "Other",
];

export const DAYS = [
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
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [currentInstitutionalEmail, setCurrentInstitutionalEmail] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [matchSuggestions, setMatchSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [confirmedPods, setConfirmedPods] = useState<any>(null); // { host_pods: [], rider_rides: [] }
  const [loadingPods, setLoadingPods] = useState(false);

  // Notification/Toast state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // OTP Verification states
  const [verificationStep, setVerificationStep] = useState<"otp" | null>(null);
  const [hasInstitutionalEmail, setHasInstitutionalEmail] = useState<boolean | null>(null);
  const [institutionalEmail, setInstitutionalEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // State for custom college name when "Other" is selected
  const [customCollege, setCustomCollege] = useState("");

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    phone_number: "",
    age: "",
    gender: "",
    student_id: "",
    institution: "",
    from_location: "",
    landmark: "",
    to_location: "",
    from_lat: null,
    from_lng: null,
    to_lat: null,
    to_lng: null,
    leave_home_time: "",
    leave_college_time: "",
    days_of_commute: [],
    prefer_hosting: false,
    prefer_taking_ride: false,
    vehicle_type: "",
    comfortable_with: "",
    agreed_to_terms: false,
    agreed_to_policies: false,
  });

  // Helper function to show notifications
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    // Auto-dismiss after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAcceptMatch = async (matchId: string, riderName: string) => {
    try {
      const response = await fetch("/api/matches/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          hostId: user?.id
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification('success', `Accepted request from ${riderName}!`);
        // Remove accepted match from queue
        setMatchSuggestions(prev => prev.filter(m => m.id !== matchId));
        // Refresh pods to show updated seat count
        if (user?.id) fetchConfirmedPods(user.id);
      } else {
        console.error("Failed to accept match", data.error);
        showNotification('error', data.error || 'Failed to accept match');
      }
    } catch (error) {
      console.error("Error accepting match:", error);
      showNotification('error', 'Error accepting match. Please try again.');
    }
  };

  const handleSkipMatch = async (matchId: string) => {
    try {
      const response = await fetch("/api/matches/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          userId: user?.id,
          userRole: 'host'
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showNotification('info', 'Skipped this match');
        setMatchSuggestions(prev => prev.filter(m => m.id !== matchId));
      } else {
        console.error("Failed to skip match", data.error);
        showNotification('error', data.error || 'Failed to skip match');
      }
    } catch (error) {
      console.error("Error skipping match:", error);
      showNotification('error', 'Error skipping match. Please try again.');
    }
  };

  const handleConfirmMatch = async (matchId: string) => {
    try {
      const confirmResponse = await fetch("/api/matches/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          riderId: user?.id
        }),
      });

      const data = await confirmResponse.json();

      if (confirmResponse.ok && data.success) {
        showNotification('success', 'Ride confirmed! You are now part of the pod.');
        setMatchSuggestions(prev => prev.filter(m => m.id !== matchId));
        // Refresh pods to show the confirmed ride
        if (user?.id) fetchConfirmedPods(user.id);
      } else {
        showNotification('error', data.error || 'Failed to confirm ride');
      }
    } catch (error) {
      console.error("Error confirming match:", error);
      showNotification('error', 'Error confirming match. Please try again.');
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      const response = await fetch("/api/matches/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          userId: user?.id,
          userRole: 'rider'
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showNotification('info', 'Rejected this match');
        setMatchSuggestions(prev => prev.filter(m => m.id !== matchId));
      } else {
        console.error("Failed to reject match", data.error);
        showNotification('error', data.error || 'Failed to reject match');
      }
    } catch (error) {
      console.error("Error rejecting match:", error);
      showNotification('error', 'Error rejecting match. Please try again.');
    }
  };

  const fetchConfirmedPods = async (userId: string) => {
    try {
      setLoadingPods(true);
      const response = await fetch("/api/pods/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      
      if (data.host_pods?.length > 0 || data.rider_rides?.length > 0) {
        setConfirmedPods(data);
      } else {
        setConfirmedPods(null);
      }
      setLoadingPods(false);
      return data;
    } catch (error) {
      console.error("Error fetching pods:", error);
      setLoadingPods(false);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (user?.id) {
       fetchConfirmedPods(user.id).then((data) => {
         if (!isMounted) return;
         console.log("📊 [Dashboard] fetchConfirmedPods data:", data);
         
         // Allow fetching suggestions if:
         // 1. User is a HOST (host_pods > 0) OR
         // 2. User has NO confirmed rides (rider_rides == 0)
         console.log("🔍 [Dashboard] Checking if should fetch suggestions...");
         console.log("📊 [Dashboard] rider_rides length:", data?.rider_rides?.length || 0);
         console.log("📊 [Dashboard] Condition result:", !data || data.rider_rides.length === 0);
         
         if (!data || data.rider_rides.length === 0) {
           console.log("📥 [Dashboard] Fetching match suggestions for user:", user.id);
           
           const fetchSuggestions = async () => {
             setLoadingSuggestions(true);
             try {
               console.log("📡 [Dashboard] Calling /api/matches/suggestions...");
               const response = await fetch("/api/matches/suggestions", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ userId: user.id }),
               });
               console.log("📊 [Dashboard] Match suggestions response status:", response.status);
               
               if (response.ok && isMounted) {
                 const suggestionsData = await response.json();
                 console.log("🎯 [Dashboard] Received match suggestions:", suggestionsData);
                 console.log("🎯 [Dashboard] Number of suggestions:", suggestionsData.length);
                 setMatchSuggestions(suggestionsData);
                 console.log("✅ [Dashboard] Match suggestions set successfully");
               }
             } catch (error) {
               console.error("❌ [Dashboard] Error fetching suggestions:", error);
             } finally {
               if (isMounted) setLoadingSuggestions(false);
             }
           };
           fetchSuggestions();
         } else {
           console.log("⏭️ [Dashboard] Skipping suggestions fetch - user has confirmed rides");
         }
       });
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, submitted]);

  useEffect(() => {
    const checkUser = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      // Small delay to allow cookies to sync after OAuth redirect
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Use getUser() which validates with the server - more reliable after OAuth
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      console.log(
        "Dashboard checkUser - authUser:",
        authUser?.email,
        "error:",
        authError?.message,
      );

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
          setIsVerified(existingEntry.email_verified);
          setCurrentInstitutionalEmail(existingEntry.institutional_email);
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
          setIsVerified(existingEntry.email_verified);
          setCurrentInstitutionalEmail(existingEntry.institutional_email);
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
    // Validate custom college if "Other" is selected
    if (formData.institution === "Other" && !customCollege)
      newErrors.institution = "Please enter your institution name";
    if (!formData.student_id)
      newErrors.student_id = "Student ID is required";
    if (!formData.from_location)
      newErrors.from_location = "Start location is required";
    if (!formData.to_location)
      newErrors.to_location = "Destination is required";
    if (!formData.from_lat || !formData.from_lng)
      newErrors.from_location = "Please select a valid location from the suggestions";
    if (!formData.to_lat || !formData.to_lng)
      newErrors.to_location = "Please select a valid location from the suggestions";
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

  const handleNextToStep3 = () => {
    // Validate step 2 fields
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
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
    setErrors({});
  };

  const handleSendOTP = async () => {
    // Validate institutional email
    if (!institutionalEmail) {
      setOtpError("Institutional email is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(institutionalEmail)) {
      setOtpError("Please enter a valid email address");
      return;
    }

    // Educational domain validation (from educational_mails.txt)
    const allowedDomains = [
      "vjit.ac.in",
      "cbit.org.in",
      "chaitanya.edu.in",
      "vce.ac.in",
      "lords.ac.in",
      "mgit.ac.in"
    ];
    const emailDomain = institutionalEmail.split("@")[1]?.toLowerCase();
    
    if (!emailDomain || !allowedDomains.includes(emailDomain)) {
      setOtpError("Unsupported college email. Please skip verification for now and we will do it later.");
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
      // Use custom college if "Other" is selected
      const finalInstitution = formData.institution === "Other" ? customCollege : formData.institution;

      // Calculate available seats based on vehicle type (2-wheeler: 1, 4-wheeler: 3)
      const availableSeats = formData.vehicle_type === '2_wheeler' ? 1 : 3;

      const { error: insertError } = await supabase.from("profiles").upsert(
        {
          id: user?.id,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          age: parseInt(formData.age),
          gender: formData.gender,
          student_id: formData.student_id,
          institution: finalInstitution,
          institutional_email: institutionalEmail,
          from_location: formData.from_location,
          pickup_landmark: formData.landmark || null,
          to_location: formData.to_location,
          from_lat: formData.from_lat,
          from_lng: formData.from_lng,
          to_lat: formData.to_lat,
          to_lng: formData.to_lng,
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

      // If user is hosting, create ride template automatically
      if (formData.prefer_hosting) {
        console.log("Creating ride template for host with", availableSeats, "seats");
        
        const rideTemplateResponse = await fetch("/api/rides/templates/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            vehicleType: formData.vehicle_type,
            availableSeats: availableSeats,
            maxDetourMeters: 2000,
            returnTime: formData.leave_college_time,
          }),
        });

        const rideTemplateResult = await rideTemplateResponse.json();

        if (rideTemplateResult.success || rideTemplateResult.ride_template_id) {
          console.log("Ride template created successfully:", rideTemplateResult.ride_template_id);
        } else {
          console.error("Failed to create ride template:", rideTemplateResult.error);
          // Don't block the flow, just log the error
        }
      }
      setIsVerified(true);
      setCurrentInstitutionalEmail(institutionalEmail);
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

  const handleRequestManualVerification = async () => {
    setSubmitting(true);
    setOtpError("");

    try {
      // Use custom college if "Other" is selected
      const finalInstitution = formData.institution === "Other" ? customCollege : formData.institution;

      // Calculate available seats based on vehicle type (2-wheeler: 1, 4-wheeler: 3)
      const availableSeats = formData.vehicle_type === '2_wheeler' ? 1 : 3;

      const { error: insertError } = await supabase.from("profiles").upsert(
        {
          id: user?.id,
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          age: parseInt(formData.age),
          gender: formData.gender,
          student_id: formData.student_id,
          institution: finalInstitution,
          institutional_email: null,
          from_location: formData.from_location,
          pickup_landmark: formData.landmark || null,
          to_location: formData.to_location,
          from_lat: formData.from_lat,
          from_lng: formData.from_lng,
          to_lat: formData.to_lat,
          to_lng: formData.to_lng,
          leave_home_time: formData.leave_home_time,
          leave_college_time: formData.leave_college_time,
          days_of_commute: formData.days_of_commute,
          prefer_hosting: formData.prefer_hosting,
          prefer_taking_ride: formData.prefer_taking_ride,
          vehicle_type: formData.vehicle_type,
          comfortable_with: formData.comfortable_with,
          agreed_to_terms: formData.agreed_to_terms,
          email_verified: false,
        },
        { onConflict: "id" },
      );

      if (insertError) {
        console.error("Error saving profile:", insertError);
        setOtpError(
          `Failed to save profile: ${insertError.message}. Please try again.`,
        );
        setSubmitting(false);
        return;
      }

      console.log("Profile saved successfully (without email)!");

      // If user is hosting, create ride template automatically
      if (formData.prefer_hosting) {
        console.log("Creating ride template for host with", availableSeats, "seats");
        
        const rideTemplateResponse = await fetch("/api/rides/templates/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.id,
            vehicleType: formData.vehicle_type,
            availableSeats: availableSeats,
            maxDetourMeters: 2000,
            returnTime: formData.leave_college_time,
          }),
        });

        const rideTemplateResult = await rideTemplateResponse.json();

        if (rideTemplateResult.success || rideTemplateResult.ride_template_id) {
          console.log("Ride template created successfully:", rideTemplateResult.ride_template_id);
        } else {
          console.error("Failed to create ride template:", rideTemplateResult.error);
          // Don't block the flow, just log the error
        }
      }

      setIsVerified(false);
      setCurrentInstitutionalEmail(null);
      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      console.error("Error saving profile:", err);
      setOtpError("Failed to save profile. Please try again.");
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

  if (submitted) {
    if (isVerified === false) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-white to-[#e8ebff] flex items-center justify-center px-4 py-8">
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
          </div>
          <div className="relative w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-10 text-center border border-white/50">
            {currentInstitutionalEmail === "REJECTED" ? (
              <>
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Verification Rejected</h2>
                <p className="text-gray-600 mb-6">
                  Your identity verification was rejected by an administrator. Please contact support.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Verifying Your Identity</h2>
                <p className="text-gray-600 mb-6">
                  Your profile is currently under manual review. This usually takes up to 24 hours. We'll notify you once verified!
                </p>
                <div className="w-12 h-12 border-4 border-[#6675FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              </>
            )}
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-white to-[#e8ebff] flex items-center justify-center px-4 py-8">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative w-full max-w-lg">
          {/* Toast Notification */}
          {notification && (
            <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              'bg-gray-800 text-white'
            }`}>
              {notification.type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          )}

          {(loadingPods) && (
             <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 text-center border border-white/50">
               <div className="w-12 h-12 border-4 border-[#6675FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-gray-500">
                 {loadingPods ? "Checking for scheduled rides..." : "Finding your best matches..."}
               </p>
             </div>
          )} {(confirmedPods && (confirmedPods.host_pods?.length > 0 || confirmedPods.rider_rides?.length > 0)) && (
            // CONFIRMED RIDE CARD
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 overflow-hidden border border-white/50">
               <div className="bg-gradient-to-r from-[#10b981] to-[#059669] p-6 text-white text-center">
                 <h2 className="text-2xl font-semibold mb-1">Pod is confirmed!</h2>
                 <p className="opacity-90">Your commute is scheduled</p>
               </div>

               <div className="p-8">
                 {/* HOST VIEW OF POD */}
                 {confirmedPods.host_pods?.length > 0 && (
                   <div className="mb-6">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Pod</h3>
                     {confirmedPods.host_pods.map((pod: any) => (
                       <div key={pod.id} className="space-y-4">
                         {/* Route Summary Card */}
                         <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                               <svg className="w-24 h-24 text-[#6675FF]" fill="currentColor" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-[#6675FF] bg-[#6675FF]/10 px-2 py-1 rounded-full uppercase tracking-wider">
                                        {pod.ride_templates.vehicle_type === '2_wheeler' ? 'Bike Pool' : 'Car Pool'}
                                    </span>
                                    <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {pod.ride_templates.departure_time}
                                    </span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-800 mb-1">My Route</h4>
                                <div className="flex items-center gap-2 text-gray-600 text-sm">
                                    <span className="truncate max-w-[45%]">{pod.ride_templates.from_location}</span>
                                    <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                    <span className="truncate max-w-[45%]">{pod.ride_templates.to_location}</span>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                     <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pod.ride_templates.available_seats > 0 ? (pod.ride_templates.seats_taken / pod.ride_templates.available_seats) * 100 : 0}%` }}
                                        ></div>
                                     </div>
                                     <span className="text-xs font-semibold text-gray-500">
                                        {pod.ride_templates.seats_taken}/{pod.ride_templates.available_seats} Seats
                                     </span>
                                </div>
                            </div>
                         </div>
                         
                         <div>
                           <div className="flex justify-between items-end mb-3">
                                <p className="text-sm font-semibold text-gray-700">Riders ({pod.pod_members?.length || 0})</p>
                           </div>
                           
                           {pod.pod_members?.length > 0 ? (
                             <div className="space-y-3">
                               {pod.pod_members.map((member: any) => (
                                 <div key={member.id} className="relative p-4 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                   <div className="flex items-center gap-3 mb-3">
                                     <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6675FF] to-[#8892ff] flex items-center justify-center text-white font-bold">
                                       {member.profiles?.full_name?.charAt(0) || "R"}
                                     </div>
                                     <div>
                                       <p className="font-semibold text-gray-800">{member.profiles?.full_name || "Rider"}</p>
                                       <div className="flex items-center gap-2 text-xs text-gray-500">
                                          <span className={`px-2 py-0.5 rounded-full ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {member.status === 'active' ? 'Confirmed' : member.status}
                                          </span>
                                       </div>
                                     </div>
                                     <a href={`tel:${member.profiles?.phone_number}`} className="ml-auto w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full hover:bg-[#6675FF] hover:text-white transition-colors">
                                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                     </a>
                                   </div>
                                    
                                   <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="bg-[#6675FF]/10 p-2 rounded-lg">
                                        <span className="block text-[#6675FF] font-bold uppercase tracking-wider text-[10px] mb-0.5">Pickup</span>
                                        <span className="text-gray-700 font-medium truncate block" title={member.ride_requests?.pickup_location}>
                                            {member.ride_requests?.pickup_location || "N/A"}
                                        </span>
                                      </div>
                                      <div className="bg-[#4d5ce6]/10 p-2 rounded-lg">
                                        <span className="block text-[#4d5ce6] font-bold uppercase tracking-wider text-[10px] mb-0.5">Dropoff</span>
                                        <span className="text-gray-700 font-medium truncate block" title={member.ride_requests?.destination_location}>
                                            {member.ride_requests?.destination_location || "N/A"}
                                        </span>
                                      </div>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-500 text-sm">Waiting for riders to match...</p>
                             </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}

                 {/* RIDER VIEW OF POD */}
                 {confirmedPods.rider_rides?.length > 0 && (
                   <div className="mb-6">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Pod</h3>
                     {confirmedPods.rider_rides.map((ride: any) => (
                       <div key={ride.id} className="space-y-4">
                         <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                           <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6675FF] to-[#8892ff] flex items-center justify-center text-white text-lg font-bold">
                             {ride.pods?.profiles?.full_name?.charAt(0) || "H"}
                           </div>
                           <div>
                             <p className="font-semibold text-gray-800 flex items-center gap-2">
                                {ride.pods?.profiles?.full_name || "Host"}
                                <span className="text-xs px-2 py-0.5 bg-[#6675FF]/10 text-[#6675FF] rounded-full font-medium">Host</span>
                             </p>
                             <p className="text-sm text-gray-500">
                               {ride.pods?.ride_templates?.vehicle_type === '2_wheeler' ? 'Bike' : 'Car'} • {ride.pods?.profiles?.gender}
                             </p>
                           </div>
                           <a href={`tel:${ride.pods?.profiles?.phone_number}`} className="ml-auto w-10 h-10 flex items-center justify-center bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                           </a>
                         </div>

                         {/* Co-Riders View */}
                         {ride.pods?.pod_members?.length > 1 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                             <p className="text-sm font-medium text-gray-700 mb-2">Co-Riders with you:</p>
                             <div className="space-y-2">
                               {ride.pods.pod_members
                                 .filter((m: any) => m.rider_id !== user?.id && m.status === 'active') // Exclude self and pending
                                 .map((member: any) => (
                                   <div key={member.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100">
                                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                                        {member.profiles?.full_name?.charAt(0) || "R"}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-800">{member.profiles?.full_name || "Rider"}</p>
                                        <p className="text-xs text-gray-500 capitalize">{member.status}</p>
                                      </div>
                                   </div>
                               ))}
                             </div>
                             {ride.pods.pod_members.filter((m: any) => m.rider_id !== user?.id && m.status === 'active').length === 0 && (
                               <p className="text-xs text-gray-400 italic">No other riders yet</p>
                             )}
                          </div>
                        )}

                         <div className="grid grid-cols-2 gap-3">
                           <div className="p-3 bg-[#6675FF]/10 rounded-xl">
                             <p className="text-xs text-[#6675FF] font-semibold uppercase mb-1">Pickup</p>
                             <p className="text-gray-700 text-sm font-medium">{ride.pickup_location}</p>
                           </div>
                           <div className="p-3 bg-[#4d5ce6]/10 rounded-xl">
                             <p className="text-xs text-[#4d5ce6] font-semibold uppercase mb-1">Time</p>
                             <p className="text-gray-700 text-sm font-medium">{ride.pods?.departure_time}</p>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </div>
          )} {matchSuggestions.length > 0 && (!confirmedPods?.rider_rides?.length) && (
            <MatchQueue 
              matchSuggestions={matchSuggestions}
              onAcceptMatch={handleAcceptMatch}
              onSkipMatch={handleSkipMatch}
              onConfirmMatch={handleConfirmMatch}
              onRejectMatch={handleRejectMatch}
              user={user}
            />
          )} {(!confirmedPods?.rider_rides?.length && !confirmedPods?.host_pods?.length && matchSuggestions.length === 0) && (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 p-8 md:p-10 border border-white/50 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#6675FF] to-[#8892ff] flex items-center justify-center animate-pulse">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-[#171717] mb-3">
                We are matching you up
              </h1>
              <p className="text-gray-500 mb-6">
                Thanks for verifying, {formData.full_name}! We&apos;re currently looking for the best riders for your route.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#6675FF]/10 text-[#6675FF] rounded-full text-sm font-medium">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8892ff] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6675FF]"></span>
                </span>
                Searching for riders...
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-white to-[#e8ebff] flex items-center justify-center px-4 py-12">
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
              className={`w-3 h-3 rounded-full transition-all ${currentStep === 1 ? "bg-[#6675FF] w-8" : currentStep > 1 ? "bg-[#6675FF]" : "bg-gray-300"}`}
            ></div>
            <div
              className={`w-3 h-3 rounded-full transition-all ${currentStep === 2 ? "bg-[#6675FF] w-8" : currentStep > 2 ? "bg-[#6675FF]" : "bg-gray-300"}`}
            ></div>
            <div
              className={`w-3 h-3 rounded-full transition-all ${currentStep === 3 ? "bg-[#6675FF] w-8" : "bg-gray-300"}`}
            ></div>
          </div>

          {/* Back Button & Subtitle */}
          <div className="flex items-center gap-3 mb-6">
            {(currentStep === 2 || currentStep === 3) && (
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
                : currentStep === 2
                ? "Set your preferences"
                : "Verify your institutional email"}
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
                      const selectedValue = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        institution: selectedValue,
                      }));
                      // Clear custom college if not "Other"
                      if (selectedValue !== "Other") {
                        setCustomCollege("");
                      }
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
                {/* Custom college input when "Other" is selected */}
                {formData.institution === "Other" && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">
                      Please specify your institution
                    </label>
                    <input
                      type="text"
                      value={customCollege}
                      onChange={(e) => {
                        setCustomCollege(e.target.value);
                        if (errors.institution)
                          setErrors((prev) => ({ ...prev, institution: "" }));
                      }}
                      placeholder="e.g., XYZ Engineering College"
                      className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.institution ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                      required
                    />
                    {errors.institution && customCollege === "" && (
                      <p className="text-red-500 text-xs mt-1 ml-1">
                        Please enter your institution name
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Student ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                  Student ID Number
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2303A51001"
                  value={formData.student_id}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      student_id: e.target.value,
                    }));
                    if (errors.student_id)
                      setErrors((prev) => ({ ...prev, student_id: "" }));
                  }}
                  className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.student_id ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                  required
                />
                {errors.student_id && (
                  <p className="text-red-500 text-xs mt-1 ml-1">
                    {errors.student_id}
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
                      onLocationSelect={(location) => {
                        setFormData((prev) => ({
                          ...prev,
                          from_lat: location.lat,
                          from_lng: location.lng,
                        }));
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
                      onLocationSelect={(location) => {
                        setFormData((prev) => ({
                          ...prev,
                          to_lat: location.lat,
                          to_lng: location.lng,
                        }));
                      }}
                      placeholder="e.g., CBIT, Gandipet"
                      error={errors.to_location}
                    />
                  </div>
                </div>

                {/* Landmark */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Near Gachibowli Stadium"
                    value={formData.landmark}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        landmark: e.target.value,
                      }));
                      if (errors.landmark)
                        setErrors((prev) => ({ ...prev, landmark: "" }));
                    }}
                    className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:border-[#6675FF] focus:ring-[#6675FF]/10 transition-all"
                  />
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
            <div className="space-y-6">
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
                          prefer_taking_ride: e.target.checked ? false : prev.prefer_taking_ride, // Uncheck other if checking this
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
                          prefer_hosting: e.target.checked ? false : prev.prefer_hosting, // Uncheck other if checking this
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

              {/* Agreement checkboxes */}
              <div className="space-y-3">
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

                <label
                  className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl bg-amber-50 border-2 border-amber-200/50 hover:bg-amber-100/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.agreed_to_policies}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        agreed_to_policies: e.target.checked,
                      }));
                    }}
                    className="w-5 h-5 text-[#6675FF] border-2 border-gray-300 rounded mt-0.5 focus:ring-2 focus:ring-[#6675FF]/50"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    I have read the{" "}
                    <a
                      href="/terms_&_conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6675FF] font-medium hover:underline"
                    >
                      Terms and Conditions
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy_policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6675FF] font-medium hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>

              <button
                onClick={handleNextToStep3}
                className="w-full mt-6 py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-[#6675FF]/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 3: Email Verification */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* First ask if user has institutional email */}
              {hasInstitutionalEmail === null && (
                <>
                  <div className="text-center mb-6">
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
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Do you have an institutional email?
                    </h3>
                    <p className="text-gray-500 text-sm">
                      An institutional email helps verify your college affiliation
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setHasInstitutionalEmail(true)}
                      className="py-4 px-6 border-2 border-[#6675FF] text-[#6675FF] font-semibold text-lg rounded-2xl hover:bg-[#6675FF] hover:text-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Yes, I have one
                    </button>
                    <button
                      onClick={() => setHasInstitutionalEmail(false)}
                      className="py-4 px-6 border-2 border-gray-300 text-gray-600 font-semibold text-lg rounded-2xl hover:border-gray-400 hover:bg-gray-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      No, I don&apos;t
                    </button>
                  </div>
                </>
              )}

              {/* User doesn't have institutional email - confirm and submit */}
              {hasInstitutionalEmail === false && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      No problem!
                    </h3>
                    <p className="text-gray-500 text-sm">
                      You can still join. You can verify your email later from your profile.
                    </p>
                  </div>

                  {otpError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-600">{otpError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleRequestManualVerification}
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-[#6675FF]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Completing...
                      </span>
                    ) : (
                      "Complete Registration"
                    )}
                  </button>

                  <button
                    onClick={() => setHasInstitutionalEmail(null)}
                    disabled={submitting}
                    className="w-full py-2 text-gray-500 font-medium hover:text-[#6675FF] transition-colors disabled:opacity-50"
                  >
                    Go back
                  </button>
                </>
              )}

              {/* User has institutional email - show email input */}
              {hasInstitutionalEmail === true && verificationStep !== "otp" && (
                <>
                  <div className="text-center mb-4">
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
                    <p className="text-gray-500 text-sm">
                      Enter your institutional email to receive a verification code
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
                      Institutional Email
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
                        setOtpError("");
                      }}
                      className={`w-full px-5 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.institutional_email ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
                    />
                    {errors.institutional_email && (
                      <p className="text-red-500 text-xs mt-1 ml-1">
                        {errors.institutional_email}
                      </p>
                    )}
                  </div>

                  {otpError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-sm text-red-600">{otpError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleSendOTP}
                    disabled={otpLoading}
                    className="w-full py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-[#6675FF]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Sending...
                      </span>
                    ) : (
                      "Send Verification Code"
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setHasInstitutionalEmail(null);
                      setInstitutionalEmail("");
                      setOtpError("");
                    }}
                    disabled={otpLoading}
                    className="w-full py-2 text-gray-500 font-medium hover:text-[#6675FF] transition-colors disabled:opacity-50"
                  >
                    Go back
                  </button>
                </>
              )}

              {/* OTP sent - show OTP input */}
              {hasInstitutionalEmail === true && verificationStep === "otp" && (
                <>
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-green-600"
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
                    <p className="text-gray-700 font-medium mb-1">
                      Code sent!
                    </p>
                    <p className="text-gray-500 text-sm">
                      We sent a 6-digit code to{" "}
                      <span className="font-medium text-[#6675FF]">
                        {institutionalEmail}
                      </span>
                    </p>
                  </div>

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
                    className="w-full py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-[#6675FF]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Resend code in {resendTimer}s
                      </p>
                    ) : (
                      <button
                        onClick={handleResendOTP}
                        disabled={otpLoading}
                        className="w-full py-2 text-[#6675FF] font-medium hover:underline disabled:opacity-50"
                      >
                        Resend Code
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
                      Change email
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Match Queue Component - Shows matches based on vehicle type queue limit
interface MatchQueueProps {
  matchSuggestions: any[];
  onAcceptMatch: (matchId: string, riderName: string) => void;
  onSkipMatch: (matchId: string) => void;
  onConfirmMatch: (matchId: string) => void;
  onRejectMatch: (matchId: string) => void;
  user: User | null;
}

function MatchQueue({ 
  matchSuggestions, 
  onAcceptMatch, 
  onSkipMatch, 
  onConfirmMatch, 
  onRejectMatch,
  user
}: MatchQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMatch = matchSuggestions[currentIndex];

  // Determine queue info based on vehicle type
  const vehicleType = currentMatch?.ride_templates?.vehicle_type || currentMatch?.ride_requests?.vehicle_preference || 'any';
  const isHostView = currentMatch?.view_type === 'host';
  const queueInfo = vehicleType === '2_wheeler' 
    ? { current: currentIndex + 1, total: 1, label: 'Bike Pool - Single Match' }
    : { current: currentIndex + 1, total: Math.min(matchSuggestions.length, 3), label: 'Car Pool - Up to 3 Matches' };

  if (!currentMatch) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 overflow-hidden border border-white/50 mt-6">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading match details...</p>
        </div>
      </div>
    );
  }

  const handleNext = () => {
    if (currentIndex < matchSuggestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleActionWithNavigation = (action: () => void, shouldNavigate: boolean = true) => {
    action();
    if (shouldNavigate && currentIndex < matchSuggestions.length - 1) {
      // Navigate to next after action
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 300);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 overflow-hidden border border-white/50 mt-6">
      {/* Header with queue indicator */}
      <div className={`p-6 text-white text-center relative ${currentMatch.status === 'accepted' ? 'bg-green-600' : 'bg-[#6675FF]'}`}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-1">
              {currentMatch.status === 'accepted' ? 'Host Accepted! Please Confirm' : 'Top Match Found!'}
            </h2>
            <p className="opacity-90 text-sm">
              {currentMatch.status === 'accepted' ? 'Your ride is ready to go' : 'Based on your route and schedule'}
            </p>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex >= matchSuggestions.length - 1}
            className="p-2 rounded-full hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Queue Progress Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {matchSuggestions.slice(0, queueInfo.total).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to match ${idx + 1}`}
            />
          ))}
        </div>
        
        {/* Queue info badge */}
        <div className="absolute top-3 right-3 bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
          {queueInfo.label} • {currentIndex + 1} of {queueInfo.total}
        </div>
      </div>

      <div className="p-8">
        {isHostView ? (
          // HOST VIEW - Reviewing Rider Requests
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6675FF] to-[#8892ff] flex items-center justify-center text-white text-xl font-bold">
                {currentMatch.ride_requests.profiles.full_name?.charAt(0) || "R"}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {currentMatch.ride_requests.profiles.full_name || "Rider"}
                </h3>
                <p className="text-gray-500 text-sm">
                  {currentMatch.ride_requests.profiles.gender} • {currentMatch.ride_requests.profiles.institution}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {Math.round(currentMatch.overall_score * 100)}% Match
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-[#6675FF]/10 p-1.5 rounded-lg text-[#6675FF]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Pickup Location</p>
                  <p className="text-gray-700">{currentMatch.ride_requests.pickup_location}</p>
                  {currentMatch.ride_requests.pickup_landmark && (
                    <p className="text-xs text-gray-500 mt-1">
                      Landmark: {currentMatch.ride_requests.pickup_landmark}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-[#6675FF]/10 p-1.5 rounded-lg text-[#6675FF]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Drop-off Location</p>
                  <p className="text-gray-700">{currentMatch.ride_requests.destination_location || currentMatch.ride_requests.to_location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-[#4d5ce6]/10 p-1.5 rounded-lg text-[#4d5ce6]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Detour</p>
                  <p className="text-gray-700">
                    {currentMatch.detour_distance_meters
                      ? `${(currentMatch.detour_distance_meters / 1000).toFixed(1)} km`
                      : "Minimal detour"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-green-100 p-1.5 rounded-lg text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Cost Contribution</p>
                  <p className="text-gray-700">₹{currentMatch.ride_requests.fuel_cost_contribution || "50"} (negotiable)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleActionWithNavigation(() => onSkipMatch(currentMatch.id), false)}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => handleActionWithNavigation(() => onAcceptMatch(currentMatch.id, currentMatch.ride_requests.profiles.full_name), false)}
                className="flex-1 py-3.5 bg-[#6675FF] hover:bg-[#5b6ae0] text-white rounded-xl font-medium transition-colors shadow-lg shadow-[#6675FF]/20"
              >
                Please wait confirming your pod
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              Contact info will be revealed after acceptance
            </p>
          </>
        ) : (
          // RIDER VIEW - Reviewing Host Matches
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6675FF] to-[#8892ff] flex items-center justify-center text-white text-xl font-bold">
                {currentMatch.ride_templates.profiles.full_name?.charAt(0) || "H"}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {currentMatch.ride_templates.profiles.full_name || "Host"}
                </h3>
                <p className="text-gray-500 text-sm">
                  {currentMatch.ride_templates.vehicle_type === '2_wheeler' ? '🏍️ Bike' : '🚗 Car'} • {currentMatch.ride_templates.profiles.gender} • {currentMatch.ride_templates.profiles.institution}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    Host Accepted! Please Confirm
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-[#6675FF]/10 p-1.5 rounded-lg text-[#6675FF]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Route</p>
                  <p className="text-gray-700">{currentMatch.ride_templates.from_location} → {currentMatch.ride_templates.to_location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-[#4d5ce6]/10 p-1.5 rounded-lg text-[#4d5ce6]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Departure Time</p>
                  <p className="text-gray-700">
                    {currentMatch.ride_templates.departure_time}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-purple-100 p-1.5 rounded-lg text-purple-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Vehicle Type</p>
                  <p className="text-gray-700">
                    {currentMatch.ride_templates.vehicle_type === '2_wheeler' ? '2 Wheeler (Bike)' : '4 Wheeler (Car)'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-green-100 p-1.5 rounded-lg text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Your Cost Contribution</p>
                  <p className="text-gray-700">₹{currentMatch.ride_requests?.fuel_cost_contribution || currentMatch.ride_templates?.fuel_cost || "50"} (negotiable)</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleActionWithNavigation(() => onRejectMatch(currentMatch.id), false)}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleActionWithNavigation(() => onConfirmMatch(currentMatch.id), false)}
                className="flex-1 py-3.5 bg-[#10b981] hover:bg-[#059669] text-white rounded-xl font-medium transition-colors shadow-lg shadow-[#10b981]/20"
              >
                Confirm Ride
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              Confirm to lock your seat (irreversible)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
