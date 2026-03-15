import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a ride template
 * Already uses direct Supabase - no backend proxy
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, vehicleType, availableSeats, maxDetourMeters, returnTime } = await request.json();

    if (!userId || !vehicleType) {
      return NextResponse.json(
        { error: "Missing required fields: userId, vehicleType" },
        { status: 400 }
      );
    }

    // Call the ride template creation function
    const { data: result, error } = await supabase.rpc("create_ride_template_from_profile", {
      user_id: userId,
      p_vehicle_type: vehicleType,
      p_available_seats: availableSeats || 1,
      p_max_detour_meters: maxDetourMeters || 2000,
      p_return_time: returnTime || null,
    });

    if (error) {
      console.error("Error creating ride template:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Trigger matching for existing ride_requests
    await supabase.rpc("generate_match_suggestions_for_ride_template", {
      template_id: result.ride_template_id
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
