import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, requireAuth } from "@/lib/auth";
import type { CreateRideTemplateInput } from "@/lib/matching/types";

/**
 * GET /api/ride-templates
 * Get the current user's ride templates
 */
export async function GET() {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();

        const { data, error } = await supabase
            .from("ride_templates")
            .select("*")
            .eq("host_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching ride templates:", error);
            return NextResponse.json(
                { error: "Failed to fetch ride templates" },
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
 * POST /api/ride-templates
 * Create a new ride template (host offering)
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();
        const body: CreateRideTemplateInput = await request.json();

        // Validate required fields
        if (
            !body.from_location ||
            !body.from_lat ||
            !body.from_lng ||
            !body.to_location ||
            !body.to_lat ||
            !body.to_lng ||
            !body.departure_time ||
            !body.days_available ||
            !body.vehicle_type ||
            !body.available_seats
        ) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if user has host preference
        const { data: profile } = await supabase
            .from("profiles")
            .select("prefer_hosting, email_verified")
            .eq("id", user.id)
            .single();

        if (!profile?.prefer_hosting) {
            return NextResponse.json(
                { error: "You must have hosting preference enabled to create ride templates" },
                { status: 403 }
            );
        }

        if (!profile?.email_verified) {
            return NextResponse.json(
                { error: "Email verification required to create ride templates" },
                { status: 403 }
            );
        }

        // Create the ride template
        const { data, error } = await supabase
            .from("ride_templates")
            .insert({
                host_id: user.id,
                from_location: body.from_location,
                from_lat: body.from_lat,
                from_lng: body.from_lng,
                to_location: body.to_location,
                to_lat: body.to_lat,
                to_lng: body.to_lng,
                departure_time: body.departure_time,
                return_time: body.return_time || null,
                days_available: body.days_available,
                vehicle_type: body.vehicle_type,
                available_seats: body.available_seats,
                gender_preference: body.gender_preference || "both",
                max_detour_meters: body.max_detour_meters || 2000,
                status: "active",
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating ride template:", error);
            return NextResponse.json(
                { error: `Failed to create ride template: ${error.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error creating ride template:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
