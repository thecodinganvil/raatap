import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Confirm a match suggestion (Rider action)
 * Host-First Architecture: Rider accepts -> Creates Pod (if needed) -> Adds Rider to Pod -> Status changes to 'accepted'
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId, riderId } = await request.json();
    console.log("📥 [API] /api/matches/confirm (Rider Confirm) - Request received:", { matchId, riderId });

    if (!matchId || !riderId) {
      console.error("❌ [API] Missing required fields:", { matchId, riderId });
      return NextResponse.json(
        { error: "Missing required fields: matchId, riderId" },
        { status: 400 }
      );
    }

    // 1. Verify Match and Rider Ownership
    const { data: match, error: fetchError } = await supabase
      .from("match_suggestions")
      .select(`
        id, 
        status, 
        ride_template_id,
        ride_request_id,
        ride_requests ( rider_id )
      `)
      .eq("id", matchId)
      .single();

    if (fetchError || !match) {
      console.error("❌ [API] Error fetching match:", fetchError);
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    if ((match.ride_requests as any)?.rider_id !== riderId) {
      console.error("❌ [API] Unauthorized: Rider ID mismatch:", { expected: riderId, actual: (match.ride_requests as any)?.rider_id });
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (match.status !== "pending_rider_approval") {
      console.error("❌ [API] Invalid match status for rider confirmation:", match.status);
      return NextResponse.json({ error: "Match is not pending rider approval" }, { status: 400 });
    }

    console.log("🔍 [API] Match verified. Ensuring Pod exists for the Host's template...");

    // 2. See if a Pod already exists for this ride_template
    let { data: existingPod } = await supabase
      .from("pods")
      .select("id")
      .eq("ride_template_id", match.ride_template_id)
      .single();

    let podId = existingPod?.id;

    if (!podId) {
      // Create new Pod
      console.log("🆕 [API] No Pod found. Creating new Pod...");
      const { data: newPod, error: podCreateError } = await supabase
        .from("pods")
        .insert({
          ride_template_id: match.ride_template_id,
          status: 'forming'
        })
        .select("id")
        .single();
        
      if (podCreateError) {
        console.error("❌ [API] Error creating Pod:", podCreateError);
        return NextResponse.json({ error: "Failed to create Pod" }, { status: 500 });
      }
      podId = newPod.id;
    }

    console.log(`✅ [API] Pod established: ${podId}. Adding Rider as Pod Member...`);

    // 3. Add Rider to Pod
    const { error: memberError } = await supabase
      .from("pod_members")
      .insert({
        pod_id: podId,
        ride_request_id: match.ride_request_id,
        rider_id: riderId,
        status: 'active', // Since rider is accepting directly, they are active
        joined_at: new Date().toISOString(),
        rider_confirmed_at: new Date().toISOString()
      });

    if (memberError && memberError.code !== '23505') { // Ignore unique violation if they are already in the pod
      console.error("❌ [API] Error adding rider to Pod:", memberError);
      return NextResponse.json({ error: "Failed to add rider to Pod" }, { status: 500 });
    }

    console.log(`✅ [API] Rider added to Pod. Updating Match status to 'accepted'...`);

    // 4. Update match_suggestion status
    const { error: updateError } = await supabase
      .from("match_suggestions")
      .update({ 
        status: "accepted",
        updated_at: new Date().toISOString()
      })
      .eq("id", matchId);

    if (updateError) {
      console.error("❌ [API] Error updating match status to accepted:", updateError);
      // We don't fail fully here since pod member was added, but it shouldn't happen
    }

    console.log("🎉 [API] Ride successfully confirmed by Rider! Pod Flow complete.");

    return NextResponse.json({
      success: true,
      message: "Ride confirmed! You are now part of the pod.",
      pod_id: podId,
    });
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
