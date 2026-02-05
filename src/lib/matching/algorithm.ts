/**
 * Matching Algorithm
 * 
 * Core matching logic for pairing riders with hosts.
 * Follows RAATAP principles:
 * - Schedule-first matching
 * - Route compatibility
 * - Preference compatibility
 * - Verified members only
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    RideRequest,
    MatchResult,
    MatchSuggestion,
} from './types';
import {
    calculateDistance,
} from './route-utils';
import {
    findOverlappingDays,
    calculateScheduleScore,
    estimateTravelTime,
} from './schedule-utils';

// Weights for overall score calculation
const SCORE_WEIGHTS = {
    route: 0.4,      // 40% weight on route compatibility
    schedule: 0.35,  // 35% weight on schedule compatibility
    preference: 0.25, // 25% weight on preference match
};

// Minimum scores to be considered a valid match
const MIN_SCORES = {
    route: 30,
    schedule: 40,
    overall: 50,
};

// Type for the Supabase client (generic to avoid strict typing issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

/**
 * Find matching ride templates for a ride request
 * This is the main matching function that returns ranked results
 */
export async function findMatchesForRequest(
    supabase: SupabaseClientAny,
    request: RideRequest,
    riderGender: 'male' | 'female'
): Promise<MatchResult[]> {
    // Use PostGIS query to find compatible templates
    const { data: templates, error } = await supabase.rpc('find_compatible_templates', {
        p_pickup_lat: request.pickup_lat,
        p_pickup_lng: request.pickup_lng,
        p_destination_lat: request.destination_lat,
        p_destination_lng: request.destination_lng,
        p_days: request.days_needed,
        p_arrival_time: request.preferred_arrival_time,
        p_flexibility_mins: request.time_flexibility_mins,
        p_vehicle_preference: request.vehicle_preference,
        p_gender_preference: request.gender_preference,
        p_rider_gender: riderGender,
        p_max_results: 20,
    });

    if (error) {
        console.error('Error finding matches:', error);
        throw new Error(`Failed to find matches: ${error.message}`);
    }

    if (!templates || templates.length === 0) {
        return [];
    }

    // Process and score each match
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches: MatchResult[] = templates.map((template: any) => {
        // Calculate travel time estimate
        const totalDistance =
            template.distance_to_pickup_meters +
            calculateDistance(
                { lat: request.pickup_lat, lng: request.pickup_lng },
                { lat: request.destination_lat, lng: request.destination_lng }
            );
        const travelTimeMins = estimateTravelTime(totalDistance);

        // Get refined schedule score
        const scheduleScore = calculateScheduleScore(
            template.days_available,
            request.days_needed,
            template.departure_time,
            request.preferred_arrival_time,
            travelTimeMins,
            request.time_flexibility_mins
        );

        // Calculate overall score
        const overallScore =
            template.route_score * SCORE_WEIGHTS.route +
            scheduleScore * SCORE_WEIGHTS.schedule +
            100 * SCORE_WEIGHTS.preference; // Full preference score if passed PostGIS filters

        return {
            templateId: template.template_id,
            hostId: template.host_id,
            hostName: template.host_name,
            fromLocation: template.from_location,
            toLocation: template.to_location,
            departureTime: template.departure_time,
            daysAvailable: template.days_available,
            vehicleType: template.vehicle_type,
            availableSeats: template.available_seats,
            seatsTaken: template.seats_taken,
            routeScore: template.route_score,
            scheduleScore,
            overallScore,
            pickupDistanceMeters: template.distance_to_pickup_meters,
            destinationDistanceMeters: template.distance_to_destination_meters,
            daysOverlap: template.days_overlap,
        };
    });

    // Filter by minimum scores and sort by overall score
    return matches
        .filter(m =>
            m.routeScore >= MIN_SCORES.route &&
            m.scheduleScore >= MIN_SCORES.schedule &&
            m.overallScore >= MIN_SCORES.overall
        )
        .sort((a, b) => b.overallScore - a.overallScore);
}

/**
 * Create match suggestions from match results
 * Stores suggestions in database for host to review
 */
export async function createMatchSuggestions(
    supabase: SupabaseClientAny,
    requestId: string,
    matches: MatchResult[]
): Promise<MatchSuggestion[]> {
    if (matches.length === 0) {
        return [];
    }

    const suggestions = matches.map(match => ({
        ride_template_id: match.templateId,
        ride_request_id: requestId,
        route_match_score: match.routeScore,
        schedule_match_score: match.scheduleScore,
        overall_score: match.overallScore,
        pickup_distance_meters: Math.round(match.pickupDistanceMeters),
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }));

    const { data, error } = await supabase
        .from('match_suggestions')
        .upsert(suggestions, {
            onConflict: 'ride_template_id,ride_request_id',
            ignoreDuplicates: false
        })
        .select();

    if (error) {
        console.error('Error creating match suggestions:', error);
        throw new Error(`Failed to create suggestions: ${error.message}`);
    }

    return data || [];
}

/**
 * Get pending match suggestions for a host
 */
export async function getHostSuggestions(
    supabase: SupabaseClientAny,
    hostId: string
): Promise<MatchSuggestion[]> {
    const { data, error } = await supabase
        .from('match_suggestions')
        .select(`
      *,
      ride_templates!inner(
        id,
        host_id,
        from_location,
        to_location,
        departure_time,
        days_available,
        vehicle_type
      ),
      ride_requests!inner(
        id,
        rider_id,
        pickup_location,
        destination_location,
        preferred_arrival_time,
        days_needed,
        profiles!rider_id(
          id,
          full_name,
          gender,
          institution
        )
      )
    `)
        .eq('ride_templates.host_id', hostId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('overall_score', { ascending: false });

    if (error) {
        console.error('Error getting host suggestions:', error);
        throw new Error(`Failed to get suggestions: ${error.message}`);
    }

    return data || [];
}

/**
 * Host accepts a match suggestion (Gate 1)
 */
export async function acceptSuggestion(
    supabase: SupabaseClientAny,
    suggestionId: string,
    hostId: string
): Promise<{ podMemberId: string; podId: string }> {
    // Get suggestion details
    const { data: suggestion, error: suggestionError } = await supabase
        .from('match_suggestions')
        .select(`
      *,
      ride_templates!inner(*),
      ride_requests!inner(*)
    `)
        .eq('id', suggestionId)
        .single();

    if (suggestionError || !suggestion) {
        throw new Error('Suggestion not found or not authorized');
    }

    // Verify host owns the template
    if (suggestion.ride_templates.host_id !== hostId) {
        throw new Error('Not authorized to accept this suggestion');
    }

    // Get or create pod for this template
    const { data: existingPod, error: podError } = await supabase
        .from('pods')
        .select('*')
        .eq('ride_template_id', suggestion.ride_template_id)
        .eq('status', 'active')
        .maybeSingle();

    if (podError) {
        throw new Error(`Failed to get pod: ${podError.message}`);
    }

    let pod = existingPod;

    // If no pod exists, create one
    if (!pod) {
        const template = suggestion.ride_templates;
        const { data: newPod, error: createError } = await supabase
            .from('pods')
            .insert({
                ride_template_id: template.id,
                host_id: hostId,
                days_active: template.days_available,
                departure_time: template.departure_time,
                origin_location: template.from_location,
                destination_location: template.to_location,
                status: 'active',
            })
            .select()
            .single();

        if (createError) {
            throw new Error(`Failed to create pod: ${createError.message}`);
        }
        pod = newPod;
    }

    // Create pod member (pending rider confirmation)
    const request = suggestion.ride_requests;
    const { data: member, error: memberError } = await supabase
        .from('pod_members')
        .insert({
            pod_id: pod.id,
            rider_id: request.rider_id,
            ride_request_id: request.id,
            pickup_location: request.pickup_location,
            pickup_lat: request.pickup_lat,
            pickup_lng: request.pickup_lng,
            host_approved_at: new Date().toISOString(),
            status: 'pending_rider',
        })
        .select()
        .single();

    if (memberError) {
        throw new Error(`Failed to create pod member: ${memberError.message}`);
    }

    // Update suggestion status
    await supabase
        .from('match_suggestions')
        .update({
            status: 'accepted',
            host_action_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

    return {
        podMemberId: member.id,
        podId: pod.id,
    };
}

/**
 * Host skips a match suggestion
 */
export async function skipSuggestion(
    supabase: SupabaseClientAny,
    suggestionId: string,
    _hostId: string
): Promise<void> {
    const { error } = await supabase
        .from('match_suggestions')
        .update({
            status: 'skipped',
            host_action_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)
        .eq('status', 'pending');

    if (error) {
        throw new Error(`Failed to skip suggestion: ${error.message}`);
    }
}

/**
 * Rider confirms pod membership (Gate 2)
 */
export async function confirmPodMembership(
    supabase: SupabaseClientAny,
    podMemberId: string,
    riderId: string
): Promise<void> {
    const { error } = await supabase
        .from('pod_members')
        .update({
            rider_confirmed_at: new Date().toISOString(),
            status: 'active',
            joined_at: new Date().toISOString(),
        })
        .eq('id', podMemberId)
        .eq('rider_id', riderId)
        .eq('status', 'pending_rider');

    if (error) {
        throw new Error(`Failed to confirm membership: ${error.message}`);
    }

    // Update ride template seats_taken
    const { data: member } = await supabase
        .from('pod_members')
        .select('pod_id')
        .eq('id', podMemberId)
        .single();

    if (member?.pod_id) {
        const { data: pod } = await supabase
            .from('pods')
            .select('ride_template_id')
            .eq('id', member.pod_id)
            .single();

        if (pod?.ride_template_id) {
            // Increment seats taken
            await supabase.rpc('increment_seats_taken', {
                template_id: pod.ride_template_id,
            });
        }
    }
}

/**
 * Calculate match statistics
 */
export function calculateMatchStats(matches: MatchResult[]): {
    totalMatches: number;
    avgRouteScore: number;
    avgScheduleScore: number;
    avgOverallScore: number;
    bestMatch: MatchResult | null;
} {
    if (matches.length === 0) {
        return {
            totalMatches: 0,
            avgRouteScore: 0,
            avgScheduleScore: 0,
            avgOverallScore: 0,
            bestMatch: null,
        };
    }

    const avgRouteScore = matches.reduce((sum, m) => sum + m.routeScore, 0) / matches.length;
    const avgScheduleScore = matches.reduce((sum, m) => sum + m.scheduleScore, 0) / matches.length;
    const avgOverallScore = matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length;

    return {
        totalMatches: matches.length,
        avgRouteScore: Math.round(avgRouteScore),
        avgScheduleScore: Math.round(avgScheduleScore),
        avgOverallScore: Math.round(avgOverallScore),
        bestMatch: matches[0] || null,
    };
}
