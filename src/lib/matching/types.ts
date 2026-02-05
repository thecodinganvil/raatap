/**
 * Matching System Types
 * 
 * Type definitions for the Raatap student pairing system.
 * Based on RAATAP_FOUNDATION.md principles:
 * - Schedule-first matching
 * - Two-gate consent
 * - Verified members only
 */

// ============================================
// Core Location Types
// ============================================

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface Location extends Coordinates {
    address: string;
}

// ============================================
// Profile Types (from existing profiles table)
// ============================================

export interface Profile {
    id: string;
    full_name: string;
    phone_number: string;
    age: number;
    gender: 'male' | 'female';
    institution: string;
    institutional_email: string | null;
    from_location: string;
    to_location: string;
    from_lat: number | null;
    from_lng: number | null;
    to_lat: number | null;
    to_lng: number | null;
    leave_home_time: string;
    leave_college_time: string;
    days_of_commute: string[];
    prefer_hosting: boolean;
    prefer_taking_ride: boolean;
    vehicle_type: VehicleType;
    comfortable_with: GenderPreference;
    agreed_to_terms: boolean;
    email_verified: boolean;
    created_at?: string;
}

// ============================================
// Ride Template Types (Host offerings)
// ============================================

export type VehicleType = '2_wheeler' | '4_wheeler';
export type GenderPreference = 'male' | 'female' | 'both';
export type TemplateStatus = 'active' | 'paused' | 'archived';

export interface RideTemplate {
    id: string;
    host_id: string;

    // Route
    from_location: string;
    from_lat: number;
    from_lng: number;
    to_location: string;
    to_lat: number;
    to_lng: number;

    // Schedule
    departure_time: string; // TIME format "HH:MM:SS"
    return_time: string | null;
    days_available: string[];

    // Capacity
    vehicle_type: VehicleType;
    available_seats: number;
    seats_taken: number;

    // Preferences
    gender_preference: GenderPreference;
    max_detour_meters: number;

    // Status & timestamps
    status: TemplateStatus;
    created_at: string;
    updated_at: string;
}

export interface CreateRideTemplateInput {
    from_location: string;
    from_lat: number;
    from_lng: number;
    to_location: string;
    to_lat: number;
    to_lng: number;
    departure_time: string;
    return_time?: string;
    days_available: string[];
    vehicle_type: VehicleType;
    available_seats: number;
    gender_preference?: GenderPreference;
    max_detour_meters?: number;
}

// ============================================
// Ride Request Types (Rider needs)
// ============================================

export type VehiclePreference = '2_wheeler' | '4_wheeler' | 'any';
export type RequestStatus = 'active' | 'matched' | 'archived';

export interface RideRequest {
    id: string;
    rider_id: string;

    // Pickup
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;

    // Destination
    destination_location: string;
    destination_lat: number;
    destination_lng: number;

    // Schedule
    preferred_arrival_time: string; // TIME format
    time_flexibility_mins: number;
    days_needed: string[];

    // Preferences
    vehicle_preference: VehiclePreference;
    gender_preference: GenderPreference;

    // Status & timestamps
    status: RequestStatus;
    created_at: string;
    updated_at: string;
}

export interface CreateRideRequestInput {
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;
    destination_location: string;
    destination_lat: number;
    destination_lng: number;
    preferred_arrival_time: string;
    time_flexibility_mins?: number;
    days_needed: string[];
    vehicle_preference?: VehiclePreference;
    gender_preference?: GenderPreference;
}

// ============================================
// Pod Types (Recurring commute groups)
// ============================================

export type PodStatus = 'active' | 'paused' | 'dissolved';

export interface Pod {
    id: string;
    ride_template_id: string;
    host_id: string;
    name: string | null;
    days_active: string[];
    departure_time: string;
    origin_location: string;
    destination_location: string;
    status: PodStatus;
    created_at: string;
    dissolved_at: string | null;
}

// ============================================
// Pod Member Types
// ============================================

export type MemberStatus =
    | 'pending_host'    // Waiting for host approval (Gate 1)
    | 'pending_rider'   // Host approved, waiting for rider confirmation (Gate 2)
    | 'active'          // Both approved, member is active
    | 'removed'         // Removed by host
    | 'left';           // Left voluntarily

export interface PodMember {
    id: string;
    pod_id: string;
    rider_id: string;
    ride_request_id: string | null;

    // Pickup
    pickup_location: string;
    pickup_lat: number;
    pickup_lng: number;

    // Consent tracking
    host_approved_at: string | null;
    rider_confirmed_at: string | null;

    // Status & timestamps
    status: MemberStatus;
    joined_at: string | null;
    left_at: string | null;
}

// ============================================
// Match Suggestion Types
// ============================================

export type SuggestionStatus =
    | 'pending'   // Not yet shown
    | 'shown'     // Shown to host
    | 'accepted'  // Host accepted
    | 'skipped'   // Host skipped
    | 'expired';  // Timed out

export interface MatchSuggestion {
    id: string;
    ride_template_id: string;
    ride_request_id: string;

    // Scores (0-100)
    route_match_score: number;
    schedule_match_score: number;
    overall_score: number;

    // Route details
    detour_distance_meters: number | null;
    detour_time_seconds: number | null;
    pickup_distance_meters: number | null;

    // Status
    status: SuggestionStatus;
    shown_to_host_at: string | null;
    host_action_at: string | null;

    // Timestamps
    created_at: string;
    expires_at: string;
}

// ============================================
// Matching Algorithm Types
// ============================================

export interface MatchCriteria {
    pickup: Coordinates;
    destination: Coordinates;
    days: string[];
    arrivalTime: string;
    flexibilityMins: number;
    vehiclePreference: VehiclePreference;
    genderPreference: GenderPreference;
    riderGender: 'male' | 'female';
}

export interface MatchResult {
    templateId: string;
    hostId: string;
    hostName: string;
    fromLocation: string;
    toLocation: string;
    departureTime: string;
    daysAvailable: string[];
    vehicleType: VehicleType;
    availableSeats: number;
    seatsTaken: number;

    // Calculated scores
    routeScore: number;
    scheduleScore: number;
    overallScore: number;

    // Distance info
    pickupDistanceMeters: number;
    destinationDistanceMeters: number;
    daysOverlap: string[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    total: number;
    page: number;
    limit: number;
}

// ============================================
// Google Routes API Types
// ============================================

export interface RouteCalculation {
    withPickup: {
        distanceMeters: number;
        durationSeconds: number;
    };
    withoutPickup: {
        distanceMeters: number;
        durationSeconds: number;
    };
    detour: {
        distanceMeters: number;
        durationSeconds: number;
    };
}

// ============================================
// Extended Types for UI Display
// ============================================

export interface MatchSuggestionWithDetails extends MatchSuggestion {
    rideTemplate: RideTemplate;
    rideRequest: RideRequest;
    riderProfile: Pick<Profile, 'id' | 'full_name' | 'gender' | 'institution'>;
    hostProfile: Pick<Profile, 'id' | 'full_name' | 'gender' | 'institution'>;
}

export interface PodWithMembers extends Pod {
    host: Pick<Profile, 'id' | 'full_name' | 'phone_number'>;
    members: Array<PodMember & {
        rider: Pick<Profile, 'id' | 'full_name' | 'phone_number'>;
    }>;
}
