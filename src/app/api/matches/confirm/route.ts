import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Confirm a match suggestion
 * Replaces backend proxy - now calls Supabase directly
 */
export async function POST(request: NextRequest) {
  try {
    const { matchId, riderId } = await request.json();
    console.log("📥 [API] /api/matches/confirm:", { matchId, riderId });

    if (!matchId || !riderId) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, riderId" },
        { status: 400 }
      );
    }

    // Call the database function to confirm the match
    const { data, error } = await supabase.rpc("confirm_match_suggestion", {
      p_match_id: matchId,
      p_rider_id: riderId,
    });

    if (error) {
      console.error("❌ [API] Error confirming match:", error);
      return NextResponse.json(
        { error: error.message, success: false },
        { status: 400 }
      );
    }

    console.log("✅ [API] Match confirmed successfully");
    return NextResponse.json({
      success: true,
      message: "Match confirmed successfully",
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
