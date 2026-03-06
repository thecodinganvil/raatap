import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Basic auth check using the cookie set during login
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader || !cookieHeader.includes("admin_session=")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, action } = await req.json();

    if (!userId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    let updatePayload: any = {};
    if (action === "approve") {
      updatePayload = {
        email_verified: true,
        institutional_email: "Manual Approval",
      };
    } else if (action === "reject") {
      updatePayload = {
        institutional_email: "REJECTED",
      };
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
