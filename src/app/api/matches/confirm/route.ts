import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const { matchId, riderId } = await request.json();
    console.log("📥 [Frontend] /api/matches/confirm:", { matchId, riderId });

    if (!matchId || !riderId) {
      return NextResponse.json(
        { error: "Missing required fields: matchId, riderId" },
        { status: 400 }
      );
    }

    // Call backend API instead of Supabase directly
    const response = await fetch(`${BACKEND_URL}/api/matches/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, riderId }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("✅ [Frontend] Match confirmed successfully");
      return NextResponse.json(data);
    }

    console.error("❌ [Frontend] Backend error:", data.error);
    return NextResponse.json(
      { error: data.error || 'Failed to confirm match' },
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