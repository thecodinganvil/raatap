import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Accept a match suggestion
 * Replaces backend proxy - now calls Supabase directly
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId, hostId, podName } = await request.json();
    console.log("📥 [API] /api/matches/accept:", { matchId, hostId, podName });

    if (!matchId || !hostId) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, hostId" },
        { status: 400 }
      );
    }

    // Call the database function to accept the match
    const { data, error } = await supabase.rpc("accept_match_suggestion", {
      match_id: matchId,
      host_id: hostId,
      pod_name: podName || null,
    });

    if (error) {
      console.error("❌ [API] Error accepting match:", error);
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 }
      );
    }

    console.log("✅ [API] Match accepted successfully");
    return NextResponse.json({
      success: true,
      message: "Match accepted successfully",
      data,
    });
  } catch (error) {
    console.error("❌ [API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", success: false },
      { status: 500 }
    );
  }
}
