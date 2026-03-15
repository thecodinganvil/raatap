import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get match suggestions for a user
 * Replaces backend proxy - now calls Supabase directly
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log("📥 [API] /api/matches/suggestions - userId:", userId);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Get match suggestions where user is either host or rider
    const { data: suggestions, error } = await supabase
      .from("match_suggestions")
      .select(`
        *,
        ride_template:ride_templates!inner(
          id,
          host_id,
          from_location,
          to_location,
          vehicle_type,
          available_seats,
          status
        ),
        ride_request:ride_requests!inner(
          id,
          rider_id,
          pickup_location,
          drop_location,
          vehicle_preference,
          status
        )
      `)
      .or(`ride_template.host_id.eq.${userId},ride_request.rider_id.eq.${userId}`)
      .in("status", ["pending", "shown", "accepted"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [API] Error fetching suggestions:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("📊 [API] Query result:", suggestions);
    console.log("📊 [API] Number of suggestions found:", suggestions?.length || 0);
    console.log("✅ [API] Returning suggestions:", suggestions?.length || 0);
    
    return NextResponse.json(suggestions || []);
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
