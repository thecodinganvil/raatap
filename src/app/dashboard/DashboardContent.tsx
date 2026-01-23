"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import LocationInput from "@/components/LocationInput";
import SessionBadge from "@/components/SessionBadge";

interface FormData {
  name: string;
  gender: string;
  college: string;
  startArea: string;
  endArea: string;
  travelTimeStart: string;
  travelTimeEnd: string;
  travelTimePreset: string;
  role: string;
  licenseImage: File | null;
}

export default function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    gender: "",
    college: "",
    startArea: "",
    endArea: "",
    travelTimeStart: "09:00",
    travelTimeEnd: "18:00",
    travelTimePreset: "",
    role: "",
    licenseImage: null,
  });

  useEffect(() => {
    const checkUser = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Check if user has already submitted to waitlist
        const { data: existingEntry } = await supabase
          .from('waitlist')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (existingEntry) {
          // User already submitted - show confirmation screen
          setFormData(prev => ({
            ...prev,
            name: existingEntry.name || prev.name,
            gender: existingEntry.gender || prev.gender,
            college: existingEntry.college || prev.college,
            startArea: existingEntry.start_area || prev.startArea,
            endArea: existingEntry.end_area || prev.endArea,
            travelTimeStart: existingEntry.travel_time_start || prev.travelTimeStart,
            travelTimeEnd: existingEntry.travel_time_end || prev.travelTimeEnd,
            role: existingEntry.role || prev.role,
          }));
          setSubmitted(true);
        } else if (session.user.user_metadata?.full_name) {
          setFormData(prev => ({ ...prev, name: session.user.user_metadata.full_name }));
        }
      } else {
        router.push("/login");
      }
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate license for Host or Both
    if ((formData.role === "host" || formData.role === "both") && !formData.licenseImage) {
      alert("Please upload your driving license image");
      return;
    }
    
    setSubmitting(true);

    try {
      let licenseUrl = null;

      // Upload license image if exists
      if (formData.licenseImage && user) {
        const fileExt = formData.licenseImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('licenses')
          .upload(fileName, formData.licenseImage);

        if (uploadError) {
          console.error('Error uploading license:', uploadError);
          alert('Failed to upload license. Please try again.');
          setSubmitting(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('licenses')
          .getPublicUrl(fileName);
        
        licenseUrl = urlData.publicUrl;
      }

      // Insert into waitlist table
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({
          user_id: user?.id,
          email: user?.email,
          name: formData.name,
          gender: formData.gender,
          college: formData.college,
          start_area: formData.startArea,
          end_area: formData.endArea,
          travel_time_start: formData.travelTimeStart,
          travel_time_end: formData.travelTimeEnd,
          role: formData.role,
          license_url: licenseUrl,
        });

      if (insertError) {
        console.error('Error saving to waitlist:', insertError);
        alert('Failed to join waitlist. Please try again.');
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePresetChange = (preset: string, startTime: string, endTime: string) => {
    setFormData(prev => ({
      ...prev,
      travelTimePreset: preset,
      travelTimeStart: startTime,
      travelTimeEnd: endTime,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, licenseImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setLicensePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({ ...prev, role }));
    // Clear license if switching to passenger
    if (role === "passenger") {
      setFormData(prev => ({ ...prev, licenseImage: null }));
      setLicensePreview(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#6675FF]/20"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] flex items-center justify-center px-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md text-center">
          <h1 className="text-2xl font-medium text-[#171717] mb-4">Setup Required</h1>
          <p className="text-gray-500">Please configure Supabase credentials in your .env.local file.</p>
          <Link href="/" className="mt-6 inline-block text-[#6675FF] font-medium hover:underline">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] flex items-center justify-center px-4 py-8">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 p-8 md:p-10 border border-white/50 max-w-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-[#6675FF] to-[#8892ff] flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-medium text-[#171717] mb-3">
            You&apos;re on the Waitlist!
          </h1>
          <p className="text-gray-500 mb-6">
            Thanks for joining, {formData.name}! We&apos;ll notify you at {user?.email} when Raatap launches.
          </p>
          {/* <button
            onClick={handleSignOut}
            className="px-6 py-3 text-[#6675FF] font-medium hover:bg-[#6675FF]/10 rounded-xl transition-colors"
          >
            Sign Out
          </button> */}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f0f2ff] via-[#f8f9fc] to-[#e8ebff] px-4 py-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#6675FF]/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6675FF]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto pt-4">
        
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6675FF]/10 to-[#8892ff]/10 border border-[#6675FF]/20 rounded-full text-[#6675FF] text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Early Access Program
            </div>
            <SessionBadge />
          </div>
          <h1 className="text-3xl md:text-4xl font-medium text-[#171717] mb-3">
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Join our waitlist to be among the first to experience community ride-sharing when we launch.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 hover:shadow-lg hover:shadow-[#6675FF]/10 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6675FF]/20 to-[#8892ff]/20 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[#6675FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-[#171717] mb-1">Verified Community</h3>
            <p className="text-sm text-gray-500">Share rides with trusted students and professionals from your institution.</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 hover:shadow-lg hover:shadow-[#6675FF]/10 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-medium text-[#171717] mb-1">Save Money</h3>
            <p className="text-sm text-gray-500">Split commute costs and save up to 60% on your daily travel expenses.</p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 hover:shadow-lg hover:shadow-[#6675FF]/10 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-medium text-[#171717] mb-1">Safe & Secure</h3>
            <p className="text-sm text-gray-500">Gender-smart matching and verified profiles for your peace of mind.</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#6675FF]/10 p-8 md:p-10 border border-white/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#6675FF] to-[#8892ff] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-medium text-[#171717]">
                Complete Your Profile
              </h2>
              <p className="text-sm text-gray-500">Help us match you with the perfect ride partners</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
                required
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                Gender <span className="text-xs text-gray-400">(for safety matching)</span>
              </label>
              <div className="relative">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10 appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select your gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* College / Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                College / Organization
              </label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
                placeholder="Your college or workplace"
                className="w-full px-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
                required
              />
            </div>

            {/* Start & End Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                  Start Location
                </label>
                <LocationInput
                  value={formData.startArea}
                  onChange={(value) => setFormData(prev => ({ ...prev, startArea: value }))}
                  placeholder="e.g., Koramangala, Bangalore"
                  icon="start"
                  required
                />
                <p className="text-xs text-gray-400 mt-1 ml-1">Enter your pickup area</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                  End Location
                </label>
                <LocationInput
                  value={formData.endArea}
                  onChange={(value) => setFormData(prev => ({ ...prev, endArea: value }))}
                  placeholder="e.g., Electronic City"
                  icon="end"
                  required
                />
                <p className="text-xs text-gray-400 mt-1 ml-1">Enter your drop-off area</p>
              </div>
            </div>

            {/* Travel Time - Custom */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                Usual Travel Time Window
              </label>
              
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { label: "Morning", preset: "morning", start: "06:00", end: "09:00" },
                  { label: "Afternoon", preset: "afternoon", start: "12:00", end: "15:00" },
                  { label: "Evening", preset: "evening", start: "17:00", end: "20:00" },
                  { label: "Flexible", preset: "flexible", start: "06:00", end: "22:00" },
                ].map(({ label, preset, start, end }) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetChange(preset, start, end)}
                    className={`px-4 py-2 text-sm rounded-xl border-2 transition-all duration-300 ${
                      formData.travelTimePreset === preset
                        ? "border-[#6675FF] bg-[#6675FF]/10 text-[#6675FF]"
                        : "border-gray-200 text-gray-600 hover:border-[#6675FF]/50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Custom Time Inputs */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="time"
                    name="travelTimeStart"
                    value={formData.travelTimeStart}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData(prev => ({ ...prev, travelTimePreset: "custom" }));
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 text-[#171717] focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300"
                    required
                  />
                </div>
                <span className="text-gray-400">to</span>
                <div className="flex-1">
                  <input
                    type="time"
                    name="travelTimeEnd"
                    value={formData.travelTimeEnd}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData(prev => ({ ...prev, travelTimePreset: "custom" }));
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-white/50 text-[#171717] focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Role Selection - Host/Passenger/Both */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                How do you want to ride?
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="passenger"
                    checked={formData.role === "passenger"}
                    onChange={() => handleRoleChange("passenger")}
                    className="peer sr-only"
                    required
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-2xl bg-white/50 text-center transition-all duration-300 peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF]/5 hover:border-[#6675FF]/50">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="font-medium text-[#171717] text-sm">Passenger</div>
                    <div className="text-xs text-gray-400 mt-0.5">I need a ride</div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="host"
                    checked={formData.role === "host"}
                    onChange={() => handleRoleChange("host")}
                    className="peer sr-only"
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-2xl bg-white/50 text-center transition-all duration-300 peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF]/5 hover:border-[#6675FF]/50">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-4-9v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      </svg>
                    </div>
                    <div className="font-medium text-[#171717] text-sm">Host</div>
                    <div className="text-xs text-gray-400 mt-0.5">I can drive</div>
                  </div>
                </label>
                
                <label className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="both"
                    checked={formData.role === "both"}
                    onChange={() => handleRoleChange("both")}
                    className="peer sr-only"
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-2xl bg-white/50 text-center transition-all duration-300 peer-checked:border-[#6675FF] peer-checked:bg-[#6675FF]/5 hover:border-[#6675FF]/50">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div className="font-medium text-[#171717] text-sm">Both</div>
                    <div className="text-xs text-gray-400 mt-0.5">Either way</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Driving License Upload - Show for Host or Both */}
            {(formData.role === "host" || formData.role === "both") && (
              <div className="animate-fadeIn">
                <label className="block text-sm font-medium text-gray-600 mb-1.5 ml-1">
                  Driving License <span className="text-red-500">*</span>
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300
                    ${licensePreview 
                      ? "border-[#6675FF] bg-[#6675FF]/5" 
                      : "border-gray-300 hover:border-[#6675FF]/50 bg-white/50"
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {licensePreview ? (
                    <div className="space-y-3">
                      <Image
                        src={licensePreview}
                        alt="License Preview"
                        width={200}
                        height={120}
                        className="mx-auto rounded-xl object-cover max-h-32"
                      />
                      <p className="text-sm text-[#6675FF]">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600">
                        Click to upload your driving license
                      </p>
                      <p className="text-xs text-gray-400">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2 ml-1">
                  Required for hosts. Your license will be verified before you can host rides.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full py-4 bg-gradient-to-r from-[#6675FF] to-[#8892ff] text-white font-medium rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#6675FF]/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                <span className="relative flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Joining Waitlist...
                    </>
                  ) : (
                    <>
                      Join the Waitlist
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Your data is secure and will only be used to match you with rides
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
