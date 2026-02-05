import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, requireAuth } from "@/lib/auth";
import { confirmPodMembership } from "@/lib/matching";

/**
 * POST /api/pods/confirm
 * Rider confirms pod membership (Gate 2 of consent)
 */
export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();
        const body = await request.json();

        const { pod_member_id } = body;

        if (!pod_member_id) {
            return NextResponse.json(
                { error: "pod_member_id is required" },
                { status: 400 }
            );
        }

        // Verify the membership belongs to this rider and is pending confirmation
        const { data: membership, error: verifyError } = await supabase
            .from("pod_members")
            .select(`
        id,
        rider_id,
        status,
        pods (
          id,
          name,
          origin_location,
          destination_location,
          departure_time,
          days_active,
          host_id
        )
      `)
            .eq("id", pod_member_id)
            .single();

        if (verifyError || !membership) {
            return NextResponse.json(
                { error: "Pod membership not found" },
                { status: 404 }
            );
        }

        if (membership.rider_id !== user.id) {
            return NextResponse.json(
                { error: "Not authorized to confirm this membership" },
                { status: 403 }
            );
        }

        if (membership.status !== "pending_rider") {
            return NextResponse.json(
                { error: `Cannot confirm: membership status is '${membership.status}'` },
                { status: 400 }
            );
        }

        // Get the pod data (handle both array and object response from Supabase)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const podData: any = Array.isArray(membership.pods)
            ? membership.pods[0]
            : membership.pods;

        if (!podData) {
            return NextResponse.json(
                { error: "Pod not found" },
                { status: 404 }
            );
        }

        // Gate 2: Rider confirms membership
        await confirmPodMembership(supabase, pod_member_id, user.id);

        // Get host info to return
        const { data: hostProfile } = await supabase
            .from("profiles")
            .select("full_name, phone_number")
            .eq("id", podData.host_id)
            .single();

        return NextResponse.json({
            success: true,
            data: {
                message: "You've joined the pod! You can now see the host's contact details.",
                pod: {
                    id: podData.id,
                    name: podData.name,
                    origin: podData.origin_location,
                    destination: podData.destination_location,
                    departure_time: podData.departure_time,
                    days: podData.days_active,
                },
                host: {
                    name: hostProfile?.full_name,
                    phone: hostProfile?.phone_number,
                },
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error confirming membership:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
