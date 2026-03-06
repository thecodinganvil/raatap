"use client";

import LocationInput from "@/components/LocationInput";
import { DAYS, COLLEGES } from "../DashboardContent";

interface ProfileFormStep1Props {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleNext: () => void;
}

export default function ProfileFormStep1({
  formData,
  setFormData,
  errors,
  setErrors,
  handleNext,
}: ProfileFormStep1Props) {
  const toggleArrayValue = (field: "days_of_commute", value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v: string) => v !== value)
        : [...prev[field], value],
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
            Full Name
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => {
              setFormData((prev: any) => ({
                ...prev,
                full_name: e.target.value,
              }));
              if (errors.full_name)
                setErrors((prev) => ({ ...prev, full_name: "" }));
            }}
            className={`w-full px-4 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.full_name ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
            placeholder="e.g., Alex Johnson"
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
            WhatsApp Number
          </label>
          <input
            type="tel"
            value={formData.phone_number}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
              setFormData((prev: any) => ({
                ...prev,
                phone_number: val,
              }));
              if (errors.phone_number)
                setErrors((prev) => ({ ...prev, phone_number: "" }));
            }}
            className={`w-full px-4 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.phone_number ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
            placeholder="98765 43210"
            required
          />
          {errors.phone_number && (
            <p className="text-red-500 text-xs mt-1 ml-1">
              {errors.phone_number}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
            Age
          </label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => {
              setFormData((prev: any) => ({
                ...prev,
                age: e.target.value,
              }));
              if (errors.age) setErrors((prev) => ({ ...prev, age: "" }));
            }}
            className={`w-full px-4 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.age ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
            placeholder="20"
            required
          />
          {errors.age && (
            <p className="text-red-500 text-xs mt-1 ml-1">{errors.age}</p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
            Gender
          </label>
          <div className="relative">
            <select
              value={formData.gender}
              onChange={(e) => {
                setFormData((prev: any) => ({
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
              setFormData((prev: any) => ({
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
                setFormData((prev: any) => ({
                  ...prev,
                  from_location: value,
                }));
                if (errors.from_location)
                  setErrors((prev) => ({ ...prev, from_location: "" }));
              }}
              onLocationSelect={(location) => {
                setFormData((prev: any) => ({
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
              Landmark (Optional)
            </label>
            <input
              type="text"
              value={formData.landmark}
              onChange={(e) => {
                setFormData((prev: any) => ({
                  ...prev,
                  landmark: e.target.value,
                }));
                if (errors.landmark)
                  setErrors((prev) => ({ ...prev, landmark: "" }));
              }}
              className={`w-full px-4 py-3.5 border-2 rounded-2xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 transition-all ${errors.landmark ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 focus:border-[#6675FF] focus:ring-[#6675FF]/10"}`}
              placeholder="e.g., Near Gachibowli Stadium"
            />
            {errors.landmark && (
              <p className="text-red-500 text-xs mt-1 ml-1">
                {errors.landmark}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 ml-1">
              To (College/Destination)
            </label>
            <LocationInput
              value={formData.to_location}
              onChange={(value) => {
                setFormData((prev: any) => ({
                  ...prev,
                  to_location: value,
                }));
                if (errors.to_location)
                  setErrors((prev) => ({ ...prev, to_location: "" }));
              }}
              onLocationSelect={(location) => {
                setFormData((prev: any) => ({
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
              setFormData((prev: any) => ({
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
              setFormData((prev: any) => ({
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
  );
}
