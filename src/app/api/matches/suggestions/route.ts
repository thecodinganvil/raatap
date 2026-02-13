
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // 1. Get ride templates for this host
    const { data: templates, error: templatesError } = await supabase
      .from("ride_templates")
      .select("id")
      .eq("host_id", userId)
      .eq("status", "active"); // Ensure we only look at active templates

    if (templatesError) {
      console.error("Error fetching templates:", templatesError);
      throw templatesError;
    }

    const templateIds = templates.map((t) => t.id);

    if (templateIds.length === 0) {
      return NextResponse.json([]); // No templates, no suggestions
    }

    // 2. Fetch match suggestions with rider details
    const { data: suggestions, error: suggestionsError } = await supabase
      .from("match_suggestions")
      .select(`
        *,
        ride_requests (
          *,
          profiles (
            *
          )
        )
      `)
      .in("ride_template_id", templateIds)
      .eq("status", "pending")
      .order("overall_score", { ascending: false });

    if (suggestionsError) {
      console.error("Error fetching suggestions:", suggestionsError);
      throw suggestionsError;
    }

    // 3. Mask sensitive data
    const maskedSuggestions = suggestions.map((suggestion) => {
      const riderProfile = suggestion.ride_requests?.profiles;
      
      if (riderProfile) {
        // Remove sensitive fields
        const {
          phone_number,
          email,
          institutional_email,
          ...maskedProfile
        } = riderProfile;

        // Reconstruct the object with masked profile
        return {
          ...suggestion,
          ride_requests: {
            ...suggestion.ride_requests,
            profiles: maskedProfile,
          },
        };
      }
      return suggestion;
    });

    console.log(`Fetched ${maskedSuggestions.length} suggestions for host ${userId}`);

    return NextResponse.json(maskedSuggestions);
  } catch (error: any) {
    console.error("Unexpected error fetching suggestions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
