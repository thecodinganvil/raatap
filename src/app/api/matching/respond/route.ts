import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, requireAuth } from "@/lib/auth";
import { acceptSuggestion, skipSuggestion } from "@/lib/matching";

/**
 * POST /api/matching/respond
 * Host responds to a match suggestion (accept or skip)
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();
        const body = await request.json();

        const { suggestion_id, action } = body;

        if (!suggestion_id) {
            return NextResponse.json(
                { error: "suggestion_id is required" },
                { status: 400 }
            );
        }

        if (!action || !["accept", "skip"].includes(action)) {
            return NextResponse.json(
                { error: "action must be 'accept' or 'skip'" },
                { status: 400 }
            );
        }

        // Verify the suggestion belongs to this host
        const { data: suggestion, error: verifyError } = await supabase
            .from("match_suggestions")
            .select(`
        id,
        status,
        ride_templates!inner (host_id)
      `)
            .eq("id", suggestion_id)
            .single();

        if (verifyError || !suggestion) {
            return NextResponse.json(
                { error: "Suggestion not found" },
                { status: 404 }
            );
        }

        // Handle Supabase join result (can be array or object)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rideTemplate: any = Array.isArray(suggestion.ride_templates)
            ? suggestion.ride_templates[0]
            : suggestion.ride_templates;

        if (rideTemplate?.host_id !== user.id) {
            return NextResponse.json(
                { error: "Not authorized to respond to this suggestion" },
                { status: 403 }
            );
        }

        if (suggestion.status !== "pending") {
            return NextResponse.json(
                { error: "Suggestion has already been responded to" },
                { status: 400 }
            );
        }

        if (action === "accept") {
            // Gate 1: Host accepts the match
            const result = await acceptSuggestion(supabase, suggestion_id, user.id);

            return NextResponse.json({
                success: true,
                data: {
                    action: "accepted",
                    pod_member_id: result.podMemberId,
                    pod_id: result.podId,
                    message: "Match accepted! Waiting for rider confirmation.",
                },
            });
        } else {
            // Host skips the match
            await skipSuggestion(supabase, suggestion_id, user.id);

            return NextResponse.json({
                success: true,
                data: {
                    action: "skipped",
                    message: "Match skipped.",
                },
            });
        }
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error responding to suggestion:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
