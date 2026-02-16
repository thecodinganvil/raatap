import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      preferredArrivalTime, 
      timeFlexibilityMins, 
      vehiclePreference, 
      genderPreference 
    } = await request.json();

    if (!userId || !preferredArrivalTime) {
      return NextResponse.json(
        { error: "Missing required fields: userId, preferredArrivalTime" },
        { status: 400 }
      );
    }

    // Call the ride request creation function
    const { data: result, error } = await supabase.rpc("create_ride_request_from_profile", {
      user_id: userId,
      p_preferred_arrival_time: preferredArrivalTime,
      p_time_flexibility_mins: timeFlexibilityMins || 15,
      p_vehicle_preference: vehiclePreference || 'any',
      p_gender_preference: genderPreference || 'both',
    });

    if (error) {
      console.error("Error creating ride request:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Trigger matching for existing ride_templates
    await supabase.rpc("generate_match_suggestions_for_ride_request", {
      request_id: result.ride_request_id
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}