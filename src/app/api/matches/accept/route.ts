import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { matchId, hostId, podName } = await request.json();
    console.log("API [matches/accept] Request:", { matchId, hostId, podName });

    if (!matchId || !hostId) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, hostId" },
        { status: 400 }
      );
    }

    // Call the accept match function
    const { data, error } = await supabase.rpc("accept_match_suggestion", {
      p_match_id: matchId,
      p_host_id: hostId,
      // pod_name: podName || null,
    });

    if (error) {
      console.error("API [matches/accept] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("API [matches/accept] Response:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}