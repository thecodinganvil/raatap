
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'https://raatap-backend.onrender.com';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log("📥 [Frontend] /api/matches/suggestions:", { userId });

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Call backend API instead of Supabase directly
    const response = await fetch(`${BACKEND_URL}/api/matches/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ [Frontend] Found ${data.length} match suggestions`);
      return NextResponse.json(data);
    }

    console.error("❌ [Frontend] Backend error:", data.error);
    return NextResponse.json(
      { error: data.error || 'Failed to fetch suggestions' },
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
