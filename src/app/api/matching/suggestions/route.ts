import { NextResponse } from "next/server";
import { createServerSupabaseClient, requireAuth } from "@/lib/auth";

/**
 * GET /api/matching/suggestions
 * Get pending match suggestions for the current host
 */
export async function GET() {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();

        // Get all pending suggestions for the host's ride templates
        const { data, error } = await supabase
            .from("match_suggestions")
            .select(`
        *,
        ride_templates!inner (
          id,
          host_id,
          from_location,
          to_location,
          departure_time,
          days_available,
          vehicle_type,
          available_seats,
          seats_taken
        ),
        ride_requests!inner (
          id,
          rider_id,
          pickup_location,
          pickup_lat,
          pickup_lng,
          destination_location,
          preferred_arrival_time,
          days_needed
        )
      `)
            .eq("ride_templates.host_id", user.id)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString())
            .order("overall_score", { ascending: false });

        if (error) {
            console.error("Error fetching suggestions:", error);
            return NextResponse.json(
                { error: "Failed to fetch suggestions" },
                { status: 500 }
            );
        }

        // Fetch rider profiles for the suggestions
        const riderIds = [...new Set(data?.map((s) => s.ride_requests.rider_id) || [])];

        let riderProfiles: Record<string, { full_name: string; gender: string; institution: string }> = {};

        if (riderIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, gender, institution")
                .in("id", riderIds);

            if (profiles) {
                riderProfiles = profiles.reduce((acc, p) => {
                    acc[p.id] = { full_name: p.full_name, gender: p.gender, institution: p.institution };
                    return acc;
                }, {} as typeof riderProfiles);
            }
        }

        // Enrich suggestions with rider info (limited preview per RAATAP principles)
        const enrichedSuggestions = data?.map((suggestion) => ({
            ...suggestion,
            rider_preview: {
                gender: riderProfiles[suggestion.ride_requests.rider_id]?.gender,
                institution: riderProfiles[suggestion.ride_requests.rider_id]?.institution,
                // Don't show full name until after acceptance (privacy)
                initial: riderProfiles[suggestion.ride_requests.rider_id]?.full_name?.charAt(0) || "?",
            },
        }));

        return NextResponse.json({
            success: true,
            data: enrichedSuggestions || [],
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error fetching suggestions:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
