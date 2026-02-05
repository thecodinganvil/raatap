import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, requireAuth } from "@/lib/auth";
import { findMatchesForRequest, createMatchSuggestions } from "@/lib/matching";

/**
 * POST /api/matching/find
 * Find matching ride templates for a ride request and create suggestions
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();
        const body = await request.json();

        const { ride_request_id } = body;

        if (!ride_request_id) {
            return NextResponse.json(
                { error: "ride_request_id is required" },
                { status: 400 }
            );
        }

        // Get the ride request
        const { data: rideRequest, error: requestError } = await supabase
            .from("ride_requests")
            .select("*")
            .eq("id", ride_request_id)
            .eq("rider_id", user.id)
            .single();

        if (requestError || !rideRequest) {
            return NextResponse.json(
                { error: "Ride request not found or not authorized" },
                { status: 404 }
            );
        }

        // Get rider's gender for matching
        const { data: profile } = await supabase
            .from("profiles")
            .select("gender")
            .eq("id", user.id)
            .single();

        if (!profile?.gender) {
            return NextResponse.json(
                { error: "Profile not complete" },
                { status: 400 }
            );
        }

        // Find matches using the algorithm
        const matches = await findMatchesForRequest(
            supabase,
            rideRequest,
            profile.gender as "male" | "female"
        );

        // Create suggestions in database
        let suggestions = [];
        if (matches.length > 0) {
            suggestions = await createMatchSuggestions(
                supabase,
                ride_request_id,
                matches
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                matches,
                suggestions_created: suggestions.length,
                message: matches.length > 0
                    ? `Found ${matches.length} potential matches`
                    : "No matches found. Try adjusting your schedule or location.",
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error finding matches:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
