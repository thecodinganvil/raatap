import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = 'https://raatap-backend.onrender.com';

export async function POST(request: NextRequest) {
  try {
    const { matchId, hostId, podName } = await request.json();
    console.log("📥 [Frontend] /api/matches/accept:", { matchId, hostId });

    if (!matchId || !hostId) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, hostId" },
        { status: 400 }
      );
    }

    // Call backend API instead of Supabase directly
    const response = await fetch(`${BACKEND_URL}/api/matches/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, hostId, podName }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("✅ [Frontend] Match accepted successfully");
      return NextResponse.json(data);
    }

    console.error("❌ [Frontend] Backend error:", data.error);
    return NextResponse.json(
      { error: data.error || 'Failed to accept match' },
      { status: response.status }
    );
  } catch (error) {
    console.error("❌ [Frontend] Backend unavailable:", error);
    return NextResponse.json(
      { error: 'Backend service unavailable. Make sure backend is running.' },
      { status: 503 }
    );
  }
}