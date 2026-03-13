
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'https://raatap-backend.onrender.com';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log("📥 [Frontend] /api/pods/current:", { userId });

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Call backend API instead of Supabase directly
    const response = await fetch(`${BACKEND_URL}/api/pods/current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [Frontend] Backend error:", errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch pods' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Ensure data structure is correct
    const hostPods = Array.isArray(data.host_pods) ? data.host_pods : [];
    const riderRides = Array.isArray(data.rider_rides) ? data.rider_rides : [];
    
    console.log(`✅ [Frontend] Found ${hostPods.length} host pods, ${riderRides.length} rider rides`);
    return NextResponse.json({ ...data, host_pods: hostPods, rider_rides: riderRides });
  } catch (error) {
    console.error("❌ [Frontend] Backend unavailable:", error);
    return NextResponse.json(
      { error: 'Backend service unavailable. Make sure backend is running.' },
      { status: 503 }
    );
  }
}
