import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { matchId, userId, userRole } = await request.json();
    console.log("API [matches/skip] Request:", { matchId, userId, userRole });

    if (!matchId || !userId || !userRole) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!['host', 'rider'].includes(userRole)) {
      return NextResponse.json(
        { error: "userRole must be either 'host' or 'rider'" },
        { status: 400 }
      );
    }

    // Call the skip match function
    const { data, error } = await supabase.rpc("skip_match_suggestion", {
      match_id: matchId,
      user_id: userId,
      user_role: userRole,
    });

    if (error) {
      console.error("API [matches/skip] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("API [matches/skip] Response:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}