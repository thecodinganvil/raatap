import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculateMatchScore } from "@/lib/matching";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a ride request (Rider)
 * API-First Architecture: Handles profile fetching, insertion, and matching native TS logic.
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      preferredArrivalTime, 
      timeFlexibilityMins = 15, 
      vehiclePreference = 'any', 
      genderPreference = 'both' 
    } = await request.json();

    if (!userId || !preferredArrivalTime) {
      return NextResponse.json(
        { error: "Missing required fields: userId, preferredArrivalTime" },
        { status: 400 }
      );
    }

    console.log(`[Request API] Received Rider request creation for user: ${userId}`);

    // 1. Fetch Rider Profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[Request API] Error fetching profile:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!profile.prefer_taking_ride) {
      return NextResponse.json({ error: "User is not a rider" }, { status: 400 });
    }

    if (!profile.from_lat || !profile.to_lat) {
      return NextResponse.json({ error: "Profile coordinates missing" }, { status: 400 });
    }

    console.log(`[Request API] Fetched Rider coordinates from profiles table`);

    // 2. Insert Ride Request
    const { data: requestRecord, error: insertError } = await supabase
      .from("ride_requests")
      .insert({
        rider_id: userId,
        pickup_location: profile.from_location,
        pickup_lat: profile.from_lat,
        pickup_lng: profile.from_lng,
        pickup_point: `POINT(${profile.from_lng} ${profile.from_lat})`,
        pickup_landmark: profile.pickup_landmark,
        destination_location: profile.to_location,
        destination_lat: profile.to_lat,
        destination_lng: profile.to_lng,
        destination_point: `POINT(${profile.to_lng} ${profile.to_lat})`,
        preferred_arrival_time: preferredArrivalTime,
        time_flexibility_mins: timeFlexibilityMins,
        days_needed: profile.days_of_commute,
        vehicle_preference: vehiclePreference,
        gender_preference: genderPreference
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Request API] Error inserting request:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`[Request API] Saved ride_request to database. ID: ${requestRecord.id}`);
    console.log(`[Request API] Executing PostGIS spatial query for intersecting ride_templates...`);

    // 3. Find matches via Spatial Query
    // Query looks for templates whose route intersects pickup and dropoff points
    const pickupPointWkt = `POINT(${profile.from_lng} ${profile.from_lat})`;
    const destinationPointWkt = `POINT(${profile.to_lng} ${profile.to_lat})`;
    
    const { data: matches, error: matchError } = await supabase
      .rpc("find_intersecting_templates", {
        p_pickup_point: pickupPointWkt,
        p_destination_point: destinationPointWkt
      });

    if (matchError) {
      console.error("[Request API] Error finding spatial matches:", matchError);
      return NextResponse.json({ success: true, ride_request_id: requestRecord.id, message: "Request created, but matching failed" });
    }

    if (matches && matches.length > 0) {
      console.log(`[Request API] Found ${matches.length} overlapping routes. Generating scores...`);
      
      const suggestionsToInsert = [];

      for (const match of matches) {
        // Fetch Host Profile for gender preference comparison
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("comfortable_with")
          .eq("id", match.host_id)
          .single();

        const score = calculateMatchScore({
          hostRouteDistance: match.host_route_distance_meters,
          pickupDistance: match.pickup_distance_meters,
          destinationDistance: match.destination_distance_meters,
          hostGenderPreference: hostProfile?.comfortable_with || 'both',
          riderGenderPreference: genderPreference,
          maxDetourMeters: 2000, 
          maxDestinationMeters: 1000
        });

        if (score.compatible) {
          suggestionsToInsert.push({
            ride_template_id: match.template_id,
            ride_request_id: requestRecord.id,
            route_match_score: score.match_score,
            overall_score: score.match_score,
            detour_distance_meters: score.pickup_distance_meters,
            pickup_distance_meters: score.pickup_distance_meters,
            overlapping_distance_meters: score.overlapping_distance_meters,
            status: 'pending_host_approval' // Host-First Flow: Only host sees initially
          });
        }
      }

      if (suggestionsToInsert.length > 0) {
        console.log(`[Request API] Inserted ${suggestionsToInsert.length} match_suggestions pending host approval.`);
        const { error: insertMatchError } = await supabase
          .from("match_suggestions")
          .insert(suggestionsToInsert);

        if (insertMatchError) {
          console.error("[Request API] Error inserting matches:", insertMatchError);
        }
      } else {
        console.log(`[Request API] No compatible matches found after scoring.`);
      }
    } else {
      console.log(`[Request API] No intersecting templates found.`);
    }

    console.log(`[Request API] Ride creation complete.`);
    
    return NextResponse.json({
      success: true,
      ride_request_id: requestRecord.id,
      message: "Ride request created successfully"
    });

  } catch (error) {
    console.error("[Request API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}