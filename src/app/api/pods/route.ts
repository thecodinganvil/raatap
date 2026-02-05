import { NextResponse } from "next/server";
import { createServerSupabaseClient, requireAuth } from "@/lib/auth";

/**
 * GET /api/pods
 * Get all pods for the current user (as host or as member)
 */
export async function GET() {
    try {
        const user = await requireAuth();
        const supabase = await createServerSupabaseClient();

        // Get pods where user is host
        const { data: hostedPods, error: hostError } = await supabase
            .from("pods")
            .select(`
        *,
        ride_templates (
          id,
          vehicle_type,
          available_seats,
          seats_taken
        ),
        pod_members (
          id,
          rider_id,
          pickup_location,
          status,
          host_approved_at,
          rider_confirmed_at,
          joined_at
        )
      `)
            .eq("host_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false });

        if (hostError) {
            console.error("Error fetching hosted pods:", hostError);
        }

        // Get pods where user is a member
        const { data: memberPods, error: memberError } = await supabase
            .from("pod_members")
            .select(`
        id,
        status,
        pickup_location,
        host_approved_at,
        rider_confirmed_at,
        joined_at,
        pods!inner (
          id,
          name,
          days_active,
          departure_time,
          origin_location,
          destination_location,
          status,
          host_id,
          created_at
        )
      `)
            .eq("rider_id", user.id)
            .in("status", ["pending_rider", "active"]);

        if (memberError) {
            console.error("Error fetching member pods:", memberError);
        }

        // Get host profiles for member pods
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hostIds = [...new Set((memberPods || []).map((m: any) => m.pods?.host_id).filter(Boolean))];
        let hostProfiles: Record<string, { full_name: string; phone_number: string }> = {};

        if (hostIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, phone_number")
                .in("id", hostIds);

            if (profiles) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                hostProfiles = profiles.reduce((acc: any, p: any) => {
                    acc[p.id] = { full_name: p.full_name, phone_number: p.phone_number };
                    return acc;
                }, {} as typeof hostProfiles);
            }
        }

        // Get rider profiles for hosted pods
        const riderIds = [...new Set(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (hostedPods || []).flatMap((p: any) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p.pod_members || []).map((m: any) => m.rider_id)
            ).filter(Boolean)
        )];
        let riderProfiles: Record<string, { full_name: string; phone_number: string }> = {};

        if (riderIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name, phone_number")
                .in("id", riderIds);

            if (profiles) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                riderProfiles = profiles.reduce((acc: any, p: any) => {
                    acc[p.id] = { full_name: p.full_name, phone_number: p.phone_number };
                    return acc;
                }, {} as typeof riderProfiles);
            }
        }

        // Enrich hosted pods with member info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedHostedPods = (hostedPods || []).map((pod: any) => ({
            ...pod,
            role: "host" as const,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pod_members: (pod.pod_members || []).map((member: any) => ({
                ...member,
                rider: member.status === "active"
                    ? riderProfiles[member.rider_id]
                    : { full_name: "Pending...", phone_number: null },
            })),
        }));

        // Enrich member pods with host info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedMemberPods = (memberPods || []).map((membership: any) => ({
            ...membership.pods,
            role: "rider" as const,
            membership: {
                id: membership.id,
                status: membership.status,
                pickup_location: membership.pickup_location,
                host_approved_at: membership.host_approved_at,
                rider_confirmed_at: membership.rider_confirmed_at,
                joined_at: membership.joined_at,
            },
            host: membership.status === "active"
                ? hostProfiles[membership.pods?.host_id]
                : { full_name: "Pending confirmation...", phone_number: null },
        }));

        return NextResponse.json({
            success: true,
            data: {
                as_host: enrichedHostedPods,
                as_rider: enrichedMemberPods,
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Unauthorized")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error fetching pods:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
