import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { matchId, hostId, podName } = await request.json();

    if (!matchId || !hostId) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, hostId" },
        { status: 400 }
      );
    }

    // Call the accept match function
    const { data, error } = await supabase.rpc("accept_match_suggestion", {
      match_id: matchId,
      host_id: hostId,
      pod_name: podName || null,
    });

    if (error) {
      console.error("Error accepting match:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}