import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRouteGeometry } from "@/lib/osrm";
import { calculateMatchScore } from "@/lib/matching";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log("[Admin Verify] ============================================");
  console.log("[Admin Verify] Received verification request");
  
  try {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader || !cookieHeader.includes("admin_session=")) {
      console.log("[Admin Verify] Unauthorized: No admin session cookie");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, action } = await req.json();
    console.log(`[Admin Verify] User ID: ${userId}, Action: ${action}`);

    if (!userId || !action || !["approve", "reject"].includes(action)) {
      console.log("[Admin Verify] Invalid parameters");
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Fetch the full profile first
    console.log(`[Admin Verify] Fetching profile for user: ${userId}`);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[Admin Verify] Error fetching profile:", profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log(`[Admin Verify] Profile fetched successfully`);
    console.log(`[Admin Verify] - Name: ${profile.full_name}`);
    console.log(`[Admin Verify] - Email: ${profile.institutional_email}`);
    console.log(`[Admin Verify] - Prefer Hosting: ${profile.prefer_hosting}`);
    console.log(`[Admin Verify] - Prefer Taking Ride: ${profile.prefer_taking_ride}`);
    console.log(`[Admin Verify] - From Location: ${profile.from_location}`);
    console.log(`[Admin Verify] - To Location: ${profile.to_location}`);
    console.log(`[Admin Verify] - Vehicle Type: ${profile.vehicle_type}`);
    console.log(`[Admin Verify] - Email Verified (before): ${profile.email_verified}`);

    let updatePayload: any = {};
    let rideCreated = false;
    let rideType = "";

    if (action === "approve") {
      console.log("[Admin Verify] Processing APPROVE action");
      
      updatePayload = {
        email_verified: true,
        institutional_email: "Manual Approval",
      };

      // Update profile first
      console.log("[Admin Verify] Updating profile with email_verified = true");
      const { error: updateError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (updateError) {
        console.error("[Admin Verify] Supabase update error:", updateError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      console.log("[Admin Verify] Profile updated successfully");

      // Create ride_template if user is a host
      if (profile.prefer_hosting) {
        console.log("[Admin Verify] User is a HOST, attempting to create ride_template");
        console.log(`[Admin Verify] Checking prerequisites:`);
        console.log(`[Admin Verify] - Has from coordinates: ${!!profile.from_lat && !!profile.from_lng}`);
        console.log(`[Admin Verify] - Has to coordinates: ${!!profile.to_lat && !!profile.to_lng}`);
        console.log(`[Admin Verify] - Has vehicle type: ${!!profile.vehicle_type}`);

        if (profile.from_lat && profile.from_lng && profile.to_lat && profile.to_lng && profile.vehicle_type) {
          try {
            // Get route geometry
            console.log("[Admin Verify] Fetching route geometry from OSRM...");
            const geometry = await getRouteGeometry(
              { lat: profile.from_lat, lng: profile.from_lng },
              { lat: profile.to_lat, lng: profile.to_lng }
            );

            if (!geometry) {
              console.error("[Admin Verify] Failed to get route geometry from OSRM");
            } else {
              console.log("[Admin Verify] Route geometry received successfully");
              
              // Convert to WKT for database insert
              const wktCoordinates = geometry.coordinates.map((coord: number[]) => `${coord[0]} ${coord[1]}`).join(', ');
              const wktGeometry = `LINESTRING(${wktCoordinates})`;

              // For RPC calls, use WKT format
              const wktForRpc = `LINESTRING(${wktCoordinates})`;

              // Calculate available seats
              const vehicleType = profile.vehicle_type;
              let availableSeats = 1;
              if (vehicleType === '2_wheeler') {
                availableSeats = 1;
              } else if (vehicleType === '4_wheeler') {
                availableSeats = Math.min(profile.available_seats || 3, 3);
              }

              console.log(`[Admin Verify] Inserting ride_template with ${availableSeats} seats`);

              const { data: template, error: insertError } = await supabase
                .from("ride_templates")
                .insert({
                  host_id: userId,
                  from_location: profile.from_location,
                  from_lat: profile.from_lat,
                  from_lng: profile.from_lng,
                  from_point: `POINT(${profile.from_lng} ${profile.from_lat})`,
                  to_location: profile.to_location,
                  to_lat: profile.to_lat,
                  to_lng: profile.to_lng,
                  to_point: `POINT(${profile.to_lng} ${profile.to_lat})`,
                  departure_time: profile.leave_home_time,
                  return_time: profile.leave_college_time || null,
                  days_available: profile.days_of_commute,
                  vehicle_type: vehicleType,
                  available_seats: availableSeats,
                  max_detour_meters: 2000,
                  gender_preference: profile.comfortable_with || 'both',
                  route_geometry: wktGeometry,
                  status: 'active'
                })
                .select("id")
                .single();

              if (insertError) {
                console.error("[Admin Verify] Error inserting ride_template:", insertError);
              } else {
                console.log(`[Admin Verify] ✅ Ride template created successfully! ID: ${template.id}`);
                rideCreated = true;
                rideType = "host";

                // Find matching ride requests
                console.log("[Admin Verify] Searching for matching ride requests...");
                
                const { data: matches, error: matchError } = await supabase
                  .rpc("find_intersecting_requests", {
                    p_route_geometry: wktForRpc,
                    p_max_detour_meters: 2000
                  });

                if (matchError) {
                  console.error("[Admin Verify] Error finding spatial matches:", matchError);
                } else if (matches && matches.length > 0) {
                  console.log(`[Admin Verify] Found ${matches.length} intersecting ride requests`);
                  
                  const suggestionsToInsert = [];

                  for (const match of matches) {
                    const { data: riderProfile } = await supabase
                      .from("profiles")
                      .select("comfortable_with")
                      .eq("id", match.rider_id)
                      .single();

                    const score = calculateMatchScore({
                      hostRouteDistance: match.host_route_distance_meters,
                      pickupDistance: match.pickup_distance_meters,
                      destinationDistance: match.destination_distance_meters,
                      hostGenderPreference: profile.comfortable_with || 'both',
                      riderGenderPreference: riderProfile?.comfortable_with || 'both',
                      maxDetourMeters: 2000,
                      maxDestinationMeters: 1000
                    });

                    if (score.compatible) {
                      suggestionsToInsert.push({
                        ride_template_id: template.id,
                        ride_request_id: match.request_id,
                        route_match_score: score.match_score,
                        overall_score: score.match_score,
                        detour_distance_meters: score.pickup_distance_meters,
                        pickup_distance_meters: score.pickup_distance_meters,
                        overlapping_distance_meters: score.overlapping_distance_meters,
                        status: 'pending_host_approval'
                      });
                    }
                  }

                  if (suggestionsToInsert.length > 0) {
                    console.log(`[Admin Verify] Inserting ${suggestionsToInsert.length} match suggestions`);
                    const { error: insertMatchError } = await supabase
                      .from("match_suggestions")
                      .insert(suggestionsToInsert);

                    if (insertMatchError) {
                      console.error("[Admin Verify] Error inserting match suggestions:", insertMatchError);
                    } else {
                      console.log(`[Admin Verify] ✅ ${suggestionsToInsert.length} match suggestions created`);
                    }
                  } else {
                    console.log("[Admin Verify] No compatible matches found after scoring");
                  }
                } else {
                  console.log("[Admin Verify] No intersecting ride requests found");
                }
              }
            }
          } catch (routeError) {
            console.error("[Admin Verify] Error in route geometry or template creation:", routeError);
          }
        } else {
          console.log("[Admin Verify] ⚠️  Skipping ride_template creation: Missing required profile data");
          console.log("[Admin Verify] - Missing from_lat/from_lng:", !profile.from_lat || !profile.from_lng);
          console.log("[Admin Verify] - Missing to_lat/to_lng:", !profile.to_lat || !profile.to_lng);
          console.log("[Admin Verify] - Missing vehicle_type:", !profile.vehicle_type);
        }
      } else {
        console.log("[Admin Verify] User is not a host, skipping ride_template creation");
      }

      // Create ride_request if user is a rider
      if (profile.prefer_taking_ride) {
        console.log("[Admin Verify] User is a RIDER, attempting to create ride_request");
        
        if (profile.from_lat && profile.from_lng && profile.to_lat && profile.to_lng) {
          console.log("[Admin Verify] Inserting ride_request...");

          const { data: request, error: requestError } = await supabase
            .from("ride_requests")
            .insert({
              rider_id: userId,
              pickup_location: profile.from_location,
              pickup_lat: profile.from_lat,
              pickup_lng: profile.from_lng,
              pickup_point: `POINT(${profile.from_lng} ${profile.from_lat})`,
              destination_location: profile.to_location,
              destination_lat: profile.to_lat,
              destination_lng: profile.to_lng,
              destination_point: `POINT(${profile.to_lng} ${profile.to_lat})`,
              departure_time: profile.leave_home_time,
              return_time: profile.leave_college_time || null,
              days_available: profile.days_of_commute,
              gender_preference: profile.comfortable_with || 'both',
              status: 'pending'
            })
            .select("id")
            .single();

          if (requestError) {
            console.error("[Admin Verify] Error inserting ride_request:", requestError);
          } else {
            console.log(`[Admin Verify] ✅ Ride request created successfully! ID: ${request.id}`);
            
            if (!rideCreated) {
              rideCreated = true;
              rideType = "rider";
            } else {
              rideType = "both";
            }

                // Find matching ride templates
            console.log("[Admin Verify] Searching for matching ride templates...");

            const { data: matches, error: matchError } = await supabase
              .rpc("find_intersecting_templates", {
                p_pickup_point: `POINT(${profile.from_lng} ${profile.from_lat})`,
                p_destination_point: `POINT(${profile.to_lng} ${profile.to_lat})`
              });

            if (matchError) {
              console.error("[Admin Verify] Error finding matching templates:", matchError);
            } else if (matches && matches.length > 0) {
              console.log(`[Admin Verify] Found ${matches.length} intersecting ride templates`);

              const suggestionsToInsert = [];

              for (const match of matches) {
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
                  riderGenderPreference: profile.comfortable_with || 'both',
                  maxDetourMeters: 2000,
                  maxDestinationMeters: 1000
                });

                if (score.compatible) {
                  suggestionsToInsert.push({
                    ride_template_id: match.template_id,
                    ride_request_id: request.id,
                    route_match_score: score.match_score,
                    overall_score: score.match_score,
                    detour_distance_meters: score.pickup_distance_meters,
                    pickup_distance_meters: score.pickup_distance_meters,
                    overlapping_distance_meters: score.overlapping_distance_meters,
                    status: 'pending_host_approval'
                  });
                }
              }

              if (suggestionsToInsert.length > 0) {
                console.log(`[Admin Verify] Inserting ${suggestionsToInsert.length} match suggestions`);
                const { error: insertMatchError } = await supabase
                  .from("match_suggestions")
                  .insert(suggestionsToInsert);

                if (insertMatchError) {
                  console.error("[Admin Verify] Error inserting match suggestions:", insertMatchError);
                } else {
                  console.log(`[Admin Verify] ✅ ${suggestionsToInsert.length} match suggestions created`);
                }
              } else {
                console.log("[Admin Verify] No compatible matches found after scoring");
              }
            } else {
              console.log("[Admin Verify] No intersecting ride templates found");
            }
          }
        } else {
          console.log("[Admin Verify] ⚠️  Skipping ride_request creation: Missing required profile data");
        }
      } else {
        console.log("[Admin Verify] User is not a rider, skipping ride_request creation");
      }

    } else if (action === "reject") {
      console.log("[Admin Verify] Processing REJECT action");
      
      updatePayload = {
        institutional_email: "REJECTED",
      };

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (error) {
        console.error("[Admin Verify] Supabase update error:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      console.log("[Admin Verify] User rejected successfully");
    }

    console.log("[Admin Verify] ============================================");
    console.log("[Admin Verify] Verification process complete!");
    console.log(`[Admin Verify] Ride created: ${rideCreated}, Type: ${rideType}`);
    console.log("[Admin Verify] ============================================");

    return NextResponse.json({ 
      success: true, 
      rideCreated,
      rideType,
      message: rideCreated 
        ? `User verified and ${rideType} ride created successfully!`
        : "User verified successfully (no ride data available)"
    });

  } catch (error) {
    console.error("[Admin Verify] Unexpected error:", error);
    console.error("[Admin Verify] Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
