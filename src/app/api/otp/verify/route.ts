import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create Supabase client with service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { otp, userId } = await request.json();

    if (!otp || !userId) {
      return NextResponse.json(
        { error: "OTP and userId are required" },
        { status: 400 }
      );
    }

    // Get stored OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("email_otps")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError || !otpRecord) {
      return NextResponse.json(
        { error: "No OTP found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if already verified
    if (otpRecord.verified) {
      return NextResponse.json(
        { error: "OTP already used. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return NextResponse.json(
        { error: "Invalid OTP. Please try again." },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("email_otps")
      .update({ verified: true })
      .eq("user_id", userId);

    return NextResponse.json({ 
      success: true, 
      message: "Email verified successfully",
      email: otpRecord.email 
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
