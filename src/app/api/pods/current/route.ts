
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log("API [pods/current] Request:", { userId });

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // 1. HOST CHECK: active pods owned by user
    const { data: hostPods, error: hostError } = await supabase
      .from("pods")
      .select(`
        *,
        ride_templates (
          vehicle_type,
          from_location,
          to_location,
          departure_time,
          seats_taken,
          available_seats
        ),
        pod_members (
          *,
          profiles (
            full_name,
            phone_number,
            gender
          ),
          ride_requests (
            pickup_location,
            pickup_landmark,
            destination_location
          )
        )
      `)
      .eq("host_id", userId)
      .eq("status", "active");

    console.log(`API [pods/current] Host Pods found: ${hostPods?.length || 0}`);
    if (hostError) {
      console.error("Error fetching host pods:", hostError);
    }

    // 1b. HOST CHECK: active ride_template if no pod
    let activeTemplate = null;
    if (!hostPods || hostPods.length === 0) {
      const { data: templates, error: templateError } = await supabase
        .from("ride_templates")
        .select("*")
        .eq("host_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (templateError) {
        console.error("Error fetching ride templates:", templateError);
      } else if (templates && templates.length > 0) {
        // Fetch confirmed/accepted matches (virtual pod members)
        const { data: confirmedMatchesWithProfiles } = await supabase
          .from("match_suggestions")
          .select(`
            id,
            status,
            ride_requests (
               id,
               rider_id,
               pickup_location,
               pickup_landmark,
               destination_location,
               profiles (
                 full_name,
                 phone_number,
                 gender
               )
            )
          `)
          .eq("ride_template_id", templates[0].id)
          .in("status", ["active", "confirmed", "accepted"]);

        console.log(`API [pods/current] Virtual Matches for template ${templates[0].id}:`, confirmedMatchesWithProfiles?.length, confirmedMatchesWithProfiles);

        const virtualMembers = confirmedMatchesWithProfiles?.map((m: any) => ({
           id: m.id, 
           status: m.status === 'confirmed' ? 'active' : 'pending',
           rider_id: m.ride_requests?.rider_id || m.rider_id,
           profiles: m.ride_requests?.profiles,
            ride_requests: {
              pickup_location: m.ride_requests?.pickup_location,
              pickup_landmark: m.ride_requests?.pickup_landmark,
              dropoff_location: m.ride_requests?.destination_location
           }
        })) || [];

        // Construct a mock pod-like structure for consistent frontend handling
        activeTemplate = {
          id: `template_${templates[0].id}`,
          status: "matching",
          ride_templates: templates[0],
          pod_members: virtualMembers
        };
      }
    }

    // 2. RIDER CHECK: confirmed memberships for user
    const { data: riderMemberships, error: riderError } = await supabase
      .from("pod_members")
      .select(`
        *,
        pods (
          *,
          profiles (
            full_name,
            phone_number,
            gender
          ),
          ride_templates (
            vehicle_type,
            from_location,
            to_location,
            departure_time
          ),
          pod_members (
            *,
            profiles (full_name, phone_number, gender)
          )
        )
      `)
      .eq("rider_id", userId)
      .eq("status", "active");

    if (riderError) {
      console.error("Error fetching rider memberships:", riderError);
    }

    return NextResponse.json({
      host_pods: hostPods && hostPods.length > 0 ? hostPods : (activeTemplate ? [activeTemplate] : []),
      rider_rides: riderMemberships || []
    });

  } catch (error: any) {
    console.error("Unexpected error fetching pods:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
