"use client";

import { useLoadScript, Autocomplete } from "@react-google-maps/api";
import { useRef, useState } from "react";

const libraries: ("places")[] = ["places"];

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon?: "start" | "end";
  required?: boolean;
}

export default function LocationInput({
  value,
  onChange,
  placeholder,
  icon = "start",
  required = false,
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
  });

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.formatted_address) {
        setInputValue(place.formatted_address);
        onChange(place.formatted_address);
      } else if (place.name) {
        setInputValue(place.name);
        onChange(place.name);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
  };

  // If no API key, just render a regular input
  if (!apiKey) {
    return (
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg 
            className={`w-5 h-5 ${icon === "end" ? "text-[#6675FF]" : "text-gray-400"}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
          required={required}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300"
          required={required}
        />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-[#6675FF] rounded-full animate-spin"></div>
        </div>
        <input
          type="text"
          placeholder="Loading..."
          className="w-full pl-12 pr-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 text-gray-400 cursor-wait"
          disabled
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <svg 
          className={`w-5 h-5 ${icon === "end" ? "text-[#6675FF]" : "text-gray-400"}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <Autocomplete
        onLoad={onLoad}
        onPlaceChanged={onPlaceChanged}
        options={{
          componentRestrictions: { country: "in" },
          types: ["geocode", "establishment"],
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full pl-12 pr-5 py-3.5 border-2 border-gray-200 rounded-2xl bg-white/50 text-[#171717] placeholder-gray-400 focus:outline-none focus:border-[#6675FF] focus:bg-white transition-all duration-300 focus:shadow-lg focus:shadow-[#6675FF]/10"
          required={required}
        />
      </Autocomplete>
    </div>
  );
}
