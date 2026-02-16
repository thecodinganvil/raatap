import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { matchId, riderId } = await request.json();
    console.log("API [matches/confirm] Request:", { matchId, riderId });

    if (!matchId || !riderId) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, riderId" },
        { status: 400 }
      );
    }

    // Call the confirm match function
    // Note: confirm_match_suggestion also updated to use p_ prefix in 07? 
    // Wait, 08 updated accept, 07 updated confirm. 
    // Let's assume standard names for now, or check 07. 
    // Checking 07... confirm_match_suggestion(match_id UUID, rider_id UUID) -- NO p_ prefix in 07.
    // So parameters are `match_id` and `rider_id`.

    const { data, error } = await supabase.rpc("confirm_match_suggestion", {
      match_id: matchId,
      p_rider_id: riderId,
    });

    if (error) {
      console.error("API [matches/confirm] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("API [matches/confirm] Response:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}