import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get current pods and rides for a user
 * Replaces backend proxy - now calls Supabase directly
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log("📥 [API] /api/pods/current - userId:", userId);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Get host pods (pods where user is the host)
    console.log("🔍 [API] Fetching host pods for user:", userId);
    const { data: hostPods, error: hostPodsError } = await supabase
      .from("pods")
      .select(`
        *,
        ride_template:ride_templates(
          id,
          from_location,
          to_location,
          departure_time,
          days_available,
          vehicle_type
        )
      `)
      .eq("host_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (hostPodsError) {
      console.error("❌ [API] Error fetching host pods:", hostPodsError);
      return NextResponse.json(
        { error: hostPodsError.message },
        { status: 500 }
      );
    }
    console.log("✅ [API] Found", hostPods?.length || 0, "host pods");

    // Get rider rides (rides where user is the rider)
    console.log("🔍 [API] Fetching rider rides for user:", userId);
    const { data: riderRides, error: riderRidesError } = await supabase
      .from("pod_members")
      .select(`
        *,
        pod:pods(
          *,
          ride_template:ride_templates(
            id,
            from_location,
            to_location,
            departure_time,
            days_available,
            vehicle_type,
            host_id
          )
        )
      `)
      .eq("rider_id", userId)
      .in("status", ["active", "pending_host", "pending_rider"])
      .order("joined_at", { ascending: false });

    if (riderRidesError) {
      console.error("❌ [API] Error fetching rider rides:", riderRidesError);
      return NextResponse.json(
        { error: riderRidesError.message },
        { status: 500 }
      );
    }
    console.log("✅ [API] Found", riderRides?.length || 0, "rider rides");

    console.log(
      `✅ [API] Total - Host pods: ${hostPods?.length || 0}, Rider rides: ${riderRides?.length || 0}`
    );

    return NextResponse.json({
      host_pods: hostPods || [],
      rider_rides: riderRides || [],
    });
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
