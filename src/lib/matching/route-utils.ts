/**
 * Route Utilities
 * 
 * Geospatial utility functions for route matching.
 * Uses Haversine formula for distance calculations.
 */

import type { Coordinates } from './types';

// Earth's radius in meters
const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate the Haversine distance between two coordinates
 * Returns distance in meters
 */
export function calculateDistance(
    point1: Coordinates,
    point2: Coordinates
): number {
    const lat1 = toRadians(point1.lat);
    const lat2 = toRadians(point2.lat);
    const deltaLat = toRadians(point2.lat - point1.lat);
    const deltaLng = toRadians(point2.lng - point1.lng);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate the bearing (direction) from point1 to point2
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
    from: Coordinates,
    to: Coordinates
): number {
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);
    const deltaLng = toRadians(to.lng - from.lng);

    const x = Math.sin(deltaLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

    let bearing = Math.atan2(x, y);
    bearing = bearing * (180 / Math.PI);
    bearing = (bearing + 360) % 360;

    return bearing;
}

/**
 * Check if two bearings are roughly in the same direction
 * Uses a tolerance of degrees (default 45°)
 */
export function isSameDirection(
    bearing1: number,
    bearing2: number,
    tolerance: number = 45
): boolean {
    let diff = Math.abs(bearing1 - bearing2);
    if (diff > 180) {
        diff = 360 - diff;
    }
    return diff <= tolerance;
}

/**
 * Calculate the perpendicular distance from a point to a line segment
 * Used to determine if a pickup point is "on the way"
 * 
 * @param point - The point to check
 * @param lineStart - Start of the line (host's origin)
 * @param lineEnd - End of the line (host's destination)
 * @returns Distance in meters from point to line
 */
export function distanceToLine(
    point: Coordinates,
    lineStart: Coordinates,
    lineEnd: Coordinates
): number {
    // Calculate distances between all points
    const distStartToEnd = calculateDistance(lineStart, lineEnd);
    const distStartToPoint = calculateDistance(lineStart, point);
    const distEndToPoint = calculateDistance(lineEnd, point);

    // Handle edge case where start and end are the same point
    if (distStartToEnd === 0) {
        return distStartToPoint;
    }

    // Calculate the projection parameter 't'
    // t = 0 means closest point is at lineStart
    // t = 1 means closest point is at lineEnd
    // 0 < t < 1 means closest point is on the line segment
    const t = Math.max(0, Math.min(1, (
        (distStartToPoint ** 2 - distEndToPoint ** 2 + distStartToEnd ** 2) /
        (2 * distStartToEnd ** 2)
    ) * distStartToEnd / distStartToEnd));

    // Interpolate to find the closest point on the line
    const closestPoint: Coordinates = {
        lat: lineStart.lat + t * (lineEnd.lat - lineStart.lat),
        lng: lineStart.lng + t * (lineEnd.lng - lineStart.lng),
    };

    return calculateDistance(point, closestPoint);
}

/**
 * Check if a pickup point is "on the way" for a host's route
 * 
 * Criteria:
 * 1. Pickup is within maxDetour meters of the direct route line
 * 2. Pickup is in the same general direction as the destination
 * 3. Pickup is not behind the starting point
 */
export function isPickupOnRoute(
    pickup: Coordinates,
    hostOrigin: Coordinates,
    hostDestination: Coordinates,
    maxDetourMeters: number = 2000
): { isOnRoute: boolean; distanceFromRoute: number; reason?: string } {
    // Calculate distance from pickup to the route line
    const distanceFromRoute = distanceToLine(pickup, hostOrigin, hostDestination);

    // Check if within detour limit
    if (distanceFromRoute > maxDetourMeters) {
        return {
            isOnRoute: false,
            distanceFromRoute,
            reason: `Pickup is ${Math.round(distanceFromRoute)}m from route (max: ${maxDetourMeters}m)`,
        };
    }

    // Check if pickup is in the same direction as destination
    const bearingToDestination = calculateBearing(hostOrigin, hostDestination);
    const bearingToPickup = calculateBearing(hostOrigin, pickup);

    if (!isSameDirection(bearingToDestination, bearingToPickup, 90)) {
        return {
            isOnRoute: false,
            distanceFromRoute,
            reason: 'Pickup is not in the direction of travel',
        };
    }

    // Check if pickup is not too far behind the origin
    const distanceToPickup = calculateDistance(hostOrigin, pickup);
    const distanceToDestination = calculateDistance(hostOrigin, hostDestination);

    // Pickup should not be more than 25% further than the destination
    if (distanceToPickup > distanceToDestination * 1.25) {
        return {
            isOnRoute: false,
            distanceFromRoute,
            reason: 'Pickup is too far from origin relative to destination',
        };
    }

    return {
        isOnRoute: true,
        distanceFromRoute,
    };
}

/**
 * Calculate extra distance added by picking up a rider
 * 
 * Simple model: origin -> pickup -> destination
 * vs direct: origin -> destination
 */
export function calculateDetourDistance(
    hostOrigin: Coordinates,
    pickup: Coordinates,
    hostDestination: Coordinates
): number {
    const directDistance = calculateDistance(hostOrigin, hostDestination);
    const viaPickupDistance =
        calculateDistance(hostOrigin, pickup) +
        calculateDistance(pickup, hostDestination);

    return viaPickupDistance - directDistance;
}

/**
 * Calculate a route score based on how close the pickup is to the route
 * Returns 0-100 (100 = on the route, 0 = very far)
 */
export function calculateRouteScore(
    pickup: Coordinates,
    hostOrigin: Coordinates,
    hostDestination: Coordinates,
    maxDetourMeters: number = 2000
): number {
    const result = isPickupOnRoute(pickup, hostOrigin, hostDestination, maxDetourMeters);

    if (!result.isOnRoute) {
        return 0;
    }

    // Score decreases as distance from route increases
    // At 0m = 100 score, at maxDetour = 50 score
    const score = 100 - (result.distanceFromRoute / maxDetourMeters) * 50;

    return Math.max(0, Math.min(100, score));
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Calculate if two destinations are at the same location (within tolerance)
 */
export function isSameDestination(
    dest1: Coordinates,
    dest2: Coordinates,
    toleranceMeters: number = 1000
): boolean {
    return calculateDistance(dest1, dest2) <= toleranceMeters;
}
