
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    console.log("API [matches/suggestions] Request:", { userId });

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Initialize arrays
    let hostMatches: any[] = [];
    let riderMatches: any[] = [];

    // 1. HOST CHECK: Check if user has active templates
    const { data: templates, error: templatesError } = await supabase
      .from("ride_templates")
      .select("id, vehicle_type")
      .eq("host_id", userId)
      .eq("status", "active");

    if (templatesError) {
      console.error("Error fetching templates:", templatesError);
    }

    if (templates && templates.length > 0) {
      const templateIds = templates.map((t) => t.id);
      
      // Determine queue limit based on vehicle type
      // For host view: we show matches based on their template's vehicle type
      // 2-wheeler: 1 match, 4-wheeler: up to 3 matches
      const vehicleType = templates[0].vehicle_type;
      const queueLimit = vehicleType === '2_wheeler' ? 1 : 3;

      const { data: hMatches, error: hError } = await supabase
        .from("match_suggestions")
        .select(`
          *,
          ride_requests (
            *,
            profiles (*)
          ),
          ride_templates (
            *,
            profiles (*)
          )
        `)
        .in("ride_template_id", templateIds)
        .eq("status", "pending") // Host sees pending requests
        .order("overall_score", { ascending: false })
        .limit(queueLimit);

      if (hError) console.error("Error fetching host matches:", hError);
      if (hMatches) hostMatches = hMatches;
    }

    // 2. RIDER CHECK: Check if user has active OR matched requests
    // (When host accepts, request status becomes 'matched', so we must include it)
    const { data: requests, error: requestsError } = await supabase
      .from("ride_requests")
      .select("id, vehicle_preference")
      .eq("rider_id", userId)
      .in("status", ["active", "matched"]);

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
    }

    if (requests && requests.length > 0) {
      const requestIds = requests.map((r) => r.id);
      
      // Determine queue limit based on vehicle preference
      // 2-wheeler preference: 1 match, 4-wheeler preference: up to 3 matches
      // If 'any', default to 3 matches
      const vehiclePreference = requests[0].vehicle_preference;
      let queueLimit = 3; // default
      if (vehiclePreference === '2_wheeler') {
        queueLimit = 1;
      }

      const { data: rMatches, error: rError } = await supabase
        .from("match_suggestions")
        .select(`
          *,
          ride_requests (
            *,
            profiles (*)
          ),
          ride_templates (
            *,
            profiles (*)
          )
        `)
        .in("ride_request_id", requestIds)
        .eq("status", "accepted") // Rider sees accepted matches
        .order("overall_score", { ascending: false })
        .limit(queueLimit);

      if (rError) console.error("Error fetching rider matches:", rError);
      if (rMatches) riderMatches = rMatches;
    }

    // 3. COMBINE & MASK
    // We combine both. The Frontend distinguishes them based on whether `ride_requests` or `ride_templates` structure matches the current view, 
    // OR we just send them all and let the UI card logic handle it (Host Card vs Rider Card).
    
    // Logic for Masking:
    // - If it came from hostMatches list: Mask the RIDER (ride_requests.profiles)
    // - If it came from riderMatches list: Mask the HOST (ride_templates.profiles)
    
    // Inject view_type to help frontend distinguish
    const hostMatchesWithView = hostMatches.map(m => ({ ...m, view_type: 'host' }));
    const riderMatchesWithView = riderMatches.map(m => ({ ...m, view_type: 'rider' }));

    const allSuggestions = [...hostMatchesWithView, ...riderMatchesWithView];

    const maskedSuggestions = allSuggestions.map((suggestion) => {
      // Is this a Host Match? (User is Host, viewing Rider)
      if (suggestion.view_type === 'host' && suggestion.ride_requests?.profiles) {
        const { phone_number, email, institutional_email, ...masked } = suggestion.ride_requests.profiles;
        return {
          ...suggestion,
          ride_requests: { ...suggestion.ride_requests, profiles: masked }
        };
      }

      // Is this a Rider Match? (User is Rider, viewing Host)
      if (suggestion.view_type === 'rider' && suggestion.ride_templates?.profiles) {
        const { phone_number, email, institutional_email, ...masked } = suggestion.ride_templates.profiles;
        return {
          ...suggestion,
          ride_templates: { ...suggestion.ride_templates, profiles: masked }
        };
      }

      return suggestion;
    });

    console.log(`API [matches/suggestions] Response: Fetched ${hostMatches.length} host matches and ${riderMatches.length} rider matches for user ${userId}`);

    return NextResponse.json(maskedSuggestions);
  } catch (error: any) {
    console.error("Unexpected error fetching suggestions:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
