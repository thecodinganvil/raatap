import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get current pods and rides for a user
 * Only returns ACTIVE members (status: 'active' or 'pending_*')
 * Calculates seats_taken based on active members only
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
          vehicle_type,
          available_seats,
          seats_taken
        ),
        pod_members(
          id,
          rider_id,
          status,
          joined_at,
          rider_confirmed_at,
          pickup_landmark,
          pickup_location,
          ride_request_id,
          profiles:profiles(
            id,
            full_name,
            phone_number,
            gender
          ),
          ride_requests(
            id,
            pickup_location,
            destination_location
          )
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
          ),
          profiles:profiles(
            id,
            full_name,
            gender,
            phone_number
          ),
          pod_members(
            id,
            rider_id,
            status,
            profiles:profiles(
              id,
              full_name
            )
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

    // Filter out inactive members and recalculate seats_taken
    const processedHostPods = (hostPods || []).map((pod) => {
      // Filter to only active members (status: 'active' or 'pending_*')
      const activeMembers = (pod.pod_members || []).filter(
        (m: any) => m.status === 'active' || m.status?.startsWith('pending_')
      );
      
      // Calculate actual seats taken
      const actualSeatsTaken = activeMembers.filter(
        (m: any) => m.status === 'active'
      ).length;

      console.log(`📊 [API] Pod ${pod.id}: ${activeMembers.length} active members, ${actualSeatsTaken} seats taken (db shows ${pod.ride_template?.seats_taken})`);

      return {
        ...pod,
        pod_members: activeMembers,
        actual_seats_taken: actualSeatsTaken,
        actual_available_seats: (pod.ride_template?.available_seats || 0) - actualSeatsTaken,
      };
    });

    // Filter inactive members from rider pod view too
    const processedRiderRides = (riderRides || []).map((ride) => {
      if (ride.pod?.pod_members) {
        const activeMembers = ride.pod.pod_members.filter(
          (m: any) => m.status === 'active' || m.status?.startsWith('pending_')
        );
        return {
          ...ride,
          pod: {
            ...ride.pod,
            pod_members: activeMembers,
          },
        };
      }
      return ride;
    });

    console.log(
      `✅ [API] Total - Host pods: ${processedHostPods.length}, Rider rides: ${processedRiderRides.length}`
    );

    // Fetch activity logs for host pods
    const podIds = processedHostPods.map((p: any) => p.id);
    let activityLogs: any[] = [];
    
    if (podIds.length > 0) {
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .in("entity_id", podIds)
        .eq("entity_type", "pod")
        .order("log_time", { ascending: false })
        .limit(20);
      
      // Transform raw logs into display-friendly format with human-readable messages
      activityLogs = (logs || []).map((log: any) => {
        let message = "";
        const normalizedAction = log.action?.toLowerCase() || "";
        
        if (normalizedAction.includes("leave")) {
          if (log.details?.reason === "schedule_conflict") {
            message = "Rider left due to schedule conflict";
          } else if (log.details?.reason === "personal_reasons") {
            message = "Rider left for personal reasons";
          } else {
            message = "Rider left the pod";
          }
        } else if (normalizedAction.includes("dismiss") || normalizedAction.includes("remove")) {
          if (log.details?.reason === "no_show") {
            message = "Rider was dismissed for no-show";
          } else if (log.details?.reason === "inappropriate_behavior") {
            message = "Rider was dismissed for inappropriate behavior";
          } else {
            message = "Rider was removed from the pod";
          }
        } else if (normalizedAction.includes("join")) {
          message = "New rider joined the pod";
        } else if (normalizedAction.includes("confirm")) {
          message = "Rider confirmed their ride";
        } else if (normalizedAction.includes("create")) {
          message = "Pod was created";
        } else {
          message = log.action || "Activity logged";
        }
        
        return {
          ...log,
          message,
        };
      });
    }

    // Log first pod data to debug
    if (processedHostPods.length > 0) {
      console.log("🔍 [API] First pod data:", JSON.stringify(processedHostPods[0], null, 2));
    }

    return NextResponse.json({
      host_pods: processedHostPods,
      rider_rides: processedRiderRides,
      activity_logs: activityLogs,
    });
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
