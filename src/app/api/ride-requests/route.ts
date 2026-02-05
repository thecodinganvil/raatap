import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, requireAuth } from "@/lib/auth";
import type { CreateRideRequestInput } from "@/lib/matching/types";

/**
 * GET /api/ride-requests
 * Get the current user's ride requests
 */
export async function GET() {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();

        const { data, error } = await supabase
            .from("ride_requests")
            .select("*")
            .eq("rider_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching ride requests:", error);
            return NextResponse.json(
                { error: "Failed to fetch ride requests" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Auth error:", error);
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }
}

/**
 * POST /api/ride-requests
 * Create a new ride request (rider need)
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();
        const body: CreateRideRequestInput = await request.json();

        // Validate required fields
        if (
            !body.pickup_location ||
            !body.pickup_lat ||
            !body.pickup_lng ||
            !body.destination_location ||
            !body.destination_lat ||
            !body.destination_lng ||
            !body.preferred_arrival_time ||
            !body.days_needed ||
            body.days_needed.length === 0
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if user has rider preference
        const { data: profile } = await supabase
            .from("profiles")
            .select("prefer_taking_ride, email_verified")
            .eq("id", user.id)
            .single();

        if (!profile?.prefer_taking_ride) {
            return NextResponse.json(
                { error: "You must have rider preference enabled to create ride requests" },
                { status: 403 }
            );
        }

        if (!profile?.email_verified) {
            return NextResponse.json(
                { error: "Email verification required to create ride requests" },
                { status: 403 }
            );
        }

        // Create the ride request
        const { data, error } = await supabase
            .from("ride_requests")
            .insert({
                rider_id: user.id,
                pickup_location: body.pickup_location,
                pickup_lat: body.pickup_lat,
                pickup_lng: body.pickup_lng,
                destination_location: body.destination_location,
                destination_lat: body.destination_lat,
                destination_lng: body.destination_lng,
                preferred_arrival_time: body.preferred_arrival_time,
                time_flexibility_mins: body.time_flexibility_mins || 15,
                days_needed: body.days_needed,
                vehicle_preference: body.vehicle_preference || "any",
                gender_preference: body.gender_preference || "both",
                status: "active",
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating ride request:", error);
            return NextResponse.json(
                { error: `Failed to create ride request: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error creating ride request:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
