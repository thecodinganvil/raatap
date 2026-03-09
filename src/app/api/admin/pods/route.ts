import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log("API [admin/pods] Fetching all pods...");

    // Fetch all active pods with their members
    const { data: pods, error: podsError } = await supabase
      .from("pods")
      .select(`
        *,
        ride_templates (
          vehicle_type,
          from_location,
          to_location,
          departure_time,
          available_seats,
          seats_taken,
          days_active
        ),
        profiles (
          full_name,
          phone_number,
          gender
        ),
        pod_members (
          *,
          profiles (
            full_name,
            phone_number,
            gender
          ),
          ride_requests (
            pickup_location
          )
        )
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (podsError) {
      console.error("Error fetching pods:", podsError);
      return NextResponse.json(
        { error: podsError.message },
        { status: 500 }
      );
    }

    // Also fetch pods from match_suggestions (virtual pods for accepted but not yet confirmed matches)
    const { data: acceptedMatches, error: matchesError } = await supabase
      .from("match_suggestions")
      .select(`
        *,
        ride_templates (
          id,
          vehicle_type,
          from_location,
          to_location,
          departure_time,
          days_active,
          profiles (
            full_name,
            phone_number,
            gender
          )
        ),
        ride_requests (
          id,
          rider_id,
          pickup_location,
          profiles (
            full_name,
            phone_number,
            gender
          )
        )
      `)
      .in("status", ["accepted", "confirmed"]);

    if (matchesError) {
      console.error("Error fetching accepted matches:", matchesError);
    }

    // Format pods data
    const formattedPods = (pods || []).map((pod: any) => ({
      id: pod.id,
      host_name: pod.profiles?.full_name || "Host",
      host_phone: pod.profiles?.phone_number,
      vehicle_type: pod.ride_templates?.vehicle_type || "4_wheeler",
      from_location: pod.ride_templates?.from_location || pod.origin_location,
      to_location: pod.ride_templates?.to_location || pod.destination_location,
      departure_time: pod.ride_templates?.departure_time || pod.departure_time,
      days_active: pod.ride_templates?.days_active || pod.days_active,
      available_seats: pod.ride_templates?.available_seats || pod.available_seats,
      seats_taken: pod.ride_templates?.seats_taken || pod.pod_members?.length || 0,
      status: pod.status,
      members: (pod.pod_members || []).map((member: any) => ({
        rider_id: member.rider_id,
        rider_name: member.profiles?.full_name || "Rider",
        phone_number: member.profiles?.phone_number,
        pickup_location: member.ride_requests?.pickup_location || "N/A",
        status: member.status,
      })),
    }));

    // Add virtual pods from accepted matches (not yet in pods table)
    if (acceptedMatches && acceptedMatches.length > 0) {
      const virtualPodsMap = new Map();

      acceptedMatches.forEach((match: any) => {
        const templateId = match.ride_template_id;
        
        if (!virtualPodsMap.has(templateId)) {
          virtualPodsMap.set(templateId, {
            id: `virtual_${templateId}`,
            host_name: match.ride_templates?.profiles?.full_name || "Host",
            vehicle_type: match.ride_templates?.vehicle_type || "4_wheeler",
            from_location: match.ride_templates?.from_location,
            to_location: match.ride_templates?.to_location,
            departure_time: match.ride_templates?.departure_time,
            days_active: match.ride_templates?.days_active,
            available_seats: match.ride_templates?.available_seats || 4,
            seats_taken: 0,
            status: "matching",
            members: [],
          });
        }

        const virtualPod = virtualPodsMap.get(templateId);
        if (match.ride_requests) {
          virtualPod.members.push({
            rider_id: match.ride_requests.rider_id,
            rider_name: match.ride_requests.profiles?.full_name || "Rider",
            phone_number: match.ride_requests.profiles?.phone_number,
            pickup_location: match.ride_requests.pickup_location || "N/A",
            status: match.status,
          });
          virtualPod.seats_taken = virtualPod.members.length;
        }
      });

      const virtualPods = Array.from(virtualPodsMap.values());
      formattedPods.push(...virtualPods);
    }

    console.log(`API [admin/pods] Found ${formattedPods.length} pods`);

    return NextResponse.json({ pods: formattedPods });
  } catch (error: any) {
    console.error("Unexpected error fetching pods:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
