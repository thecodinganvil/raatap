/**
 * Match Scoring Utility
 * 
 * Natively calculates ride matching scores based on the Host-First Architecture
 * Replaces the deprecated `calculate_route_match_score` PL/pgSQL function.
 */

export interface MatchScoreResult {
  compatible: boolean;
  match_score: number;
  pickup_distance_meters: number;
  pickup_distance_km: number;
  destination_distance_meters: number;
  destination_distance_km: number;
  overlapping_distance_meters: number;
  overlapping_distance_km: number;
  overlap_ratio: number;
  host_route_distance_meters: number;
  host_route_distance_km: number;
  reason: string;
}

export function calculateMatchScore({
  hostRouteDistance,
  pickupDistance,
  destinationDistance,
  hostGenderPreference,
  riderGenderPreference,
  maxDetourMeters = 2000,
  maxDestinationMeters = 1000,
}: {
  hostRouteDistance: number;
  pickupDistance: number;
  destinationDistance: number;
  hostGenderPreference: string;
  riderGenderPreference: string;
  maxDetourMeters?: number;
  maxDestinationMeters?: number;
}): MatchScoreResult {
  // 1. Gender Compatibility Check
  const genderCompatible = 
    hostGenderPreference === 'both' ||
    riderGenderPreference === 'both' ||
    hostGenderPreference === riderGenderPreference;

  if (!genderCompatible) {
    return {
      compatible: false,
      match_score: 0,
      pickup_distance_meters: Math.round(pickupDistance),
      pickup_distance_km: parseFloat((pickupDistance / 1000).toFixed(2)),
      destination_distance_meters: Math.round(destinationDistance),
      destination_distance_km: parseFloat((destinationDistance / 1000).toFixed(2)),
      overlapping_distance_meters: 0,
      overlapping_distance_km: 0,
      overlap_ratio: 0,
      host_route_distance_meters: Math.round(hostRouteDistance),
      host_route_distance_km: parseFloat((hostRouteDistance / 1000).toFixed(2)),
      reason: 'Gender preference mismatch'
    };
  }

  // 2. Pickup Distance Check
  if (pickupDistance > maxDetourMeters) {
    return {
      compatible: false,
      match_score: 0,
      pickup_distance_meters: Math.round(pickupDistance),
      pickup_distance_km: parseFloat((pickupDistance / 1000).toFixed(2)),
      destination_distance_meters: Math.round(destinationDistance),
      destination_distance_km: parseFloat((destinationDistance / 1000).toFixed(2)),
      overlapping_distance_meters: 0,
      overlapping_distance_km: 0,
      overlap_ratio: 0,
      host_route_distance_meters: Math.round(hostRouteDistance),
      host_route_distance_km: parseFloat((hostRouteDistance / 1000).toFixed(2)),
      reason: `Pickup location too far (>${(pickupDistance/1000).toFixed(2)}km)`
    };
  }

  // 3. Destination Distance Check
  if (destinationDistance > maxDestinationMeters) {
    return {
      compatible: false,
      match_score: 0,
      pickup_distance_meters: Math.round(pickupDistance),
      pickup_distance_km: parseFloat((pickupDistance / 1000).toFixed(2)),
      destination_distance_meters: Math.round(destinationDistance),
      destination_distance_km: parseFloat((destinationDistance / 1000).toFixed(2)),
      overlapping_distance_meters: 0,
      overlapping_distance_km: 0,
      overlap_ratio: 0,
      host_route_distance_meters: Math.round(hostRouteDistance),
      host_route_distance_km: parseFloat((hostRouteDistance / 1000).toFixed(2)),
      reason: `Destination too far (>${(destinationDistance/1000).toFixed(2)}km)`
    };
  }

  // 4. Calculate Overlapping Distance (for cost splitting)
  let overlapRatio = 1.0 - (
    (pickupDistance + destinationDistance) / 
    (hostRouteDistance + pickupDistance + destinationDistance || 1)
  );
  overlapRatio = Math.max(0, Math.min(1, overlapRatio));
  const overlappingDistance = hostRouteDistance * overlapRatio;

  // 5. Calculate Match Score
  let matchScore = (
    (1.0 - (pickupDistance / 2000.0)) * 0.50 +
    (1.0 - (destinationDistance / 1000.0)) * 0.30 +
    overlapRatio * 0.20
  ) * 100;

  matchScore = Math.max(0, Math.min(100, matchScore));

  return {
    compatible: true,
    match_score: parseFloat(matchScore.toFixed(2)),
    pickup_distance_meters: Math.round(pickupDistance),
    pickup_distance_km: parseFloat((pickupDistance / 1000).toFixed(2)),
    destination_distance_meters: Math.round(destinationDistance),
    destination_distance_km: parseFloat((destinationDistance / 1000).toFixed(2)),
    overlapping_distance_meters: Math.round(overlappingDistance),
    overlapping_distance_km: parseFloat((overlappingDistance / 1000).toFixed(2)),
    overlap_ratio: parseFloat(overlapRatio.toFixed(2)),
    host_route_distance_meters: Math.round(hostRouteDistance),
    host_route_distance_km: parseFloat((hostRouteDistance / 1000).toFixed(2)),
    reason: 'Compatible route found via API'
  };
}
