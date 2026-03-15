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
    console.log("📥 [API] /api/matches/accept - Request received:", { 
      matchId, 
      hostId, 
      podName,
      matchIdType: typeof matchId,
      hostIdType: typeof hostId 
    });

    if (!matchId || !hostId) {
      console.error("❌ [API] Missing required fields:", { matchId, hostId });
      return NextResponse.json(
        { error: "Missing required fields: matchId, hostId" },
        { status: 400 }
      );
    }

    // Check if function exists first
    console.log("🔍 [API] Calling accept_match_suggestion RPC...");
    const { data, error } = await supabase.rpc("accept_match_suggestion", {
      match_id: matchId,
      p_host_id: hostId,
      pod_name: podName || null,
    });

    console.log("📊 [API] RPC Response:", { 
      data, 
      error: error ? { message: error.message, details: error.details, hint: error.hint } : null 
    });

    if (error) {
      console.error("❌ [API] Error accepting match:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { 
          error: error.message, 
          details: error.details,
          hint: error.hint,
          success: false 
        },
        { status: 400 }
      );
    }

    if (!data) {
      console.error("❌ [API] No data returned from function");
      return NextResponse.json(
        { error: "No response from database function", success: false },
        { status: 500 }
      );
    }

    // Check if function returned success
    const success = (data as any)?.success;
    const errorMsg = (data as any)?.error;
    
    console.log("📊 [API] Function result:", { success, errorMsg, pod_id: (data as any)?.pod_id });

    if (!success) {
      console.error("❌ [API] Function returned success=false:", errorMsg);
      return NextResponse.json(
        { error: errorMsg || "Failed to accept match", success: false },
        { status: 400 }
      );
    }

    console.log("✅ [API] Match accepted successfully:", {
      pod_id: (data as any)?.pod_id,
      match_id: matchId,
      message: (data as any)?.message
    });

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
