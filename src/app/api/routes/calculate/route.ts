import { NextRequest, NextResponse } from "next/server";
import type { RouteCalculation } from "@/lib/matching/types";

interface RouteRequest {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    pickup?: { lat: number; lng: number };
}

/**
 * POST /api/routes/calculate
 * Calculate route with and without a pickup point using Google Directions API
 * Returns the detour distance and time
 */
export async function POST(request: NextRequest) {
    try {
        const body: RouteRequest = await request.json();

        const { origin, destination, pickup } = body;

        if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
            return NextResponse.json(
                { error: "Origin and destination with lat/lng are required" },
                { status: 400 }
            );
        }

        const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!googleApiKey) {
            return NextResponse.json(
                { error: "Google Maps API key not configured" },
                { status: 500 }
            );
        }

        // Calculate direct route (origin -> destination)
        const directRouteResponse = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?` +
            new URLSearchParams({
                origin: `${origin.lat},${origin.lng}`,
                destination: `${destination.lat},${destination.lng}`,
                key: googleApiKey,
                mode: "driving",
                departure_time: "now",
            })
        );

        const directRouteData = await directRouteResponse.json();

        if (directRouteData.status !== "OK" || !directRouteData.routes?.[0]) {
            console.error("Direct route error:", directRouteData);
            return NextResponse.json(
                { error: "Failed to calculate direct route" },
                { status: 500 }
            );
        }

        const directRoute = directRouteData.routes[0].legs[0];
        const directDistance = directRoute.distance.value; // meters
        const directDuration = directRoute.duration.value; // seconds

        // If no pickup point, just return direct route info
        if (!pickup?.lat || !pickup?.lng) {
            return NextResponse.json({
                success: true,
                data: {
                    direct: {
                        distanceMeters: directDistance,
                        durationSeconds: directDuration,
                        distanceText: directRoute.distance.text,
                        durationText: directRoute.duration.text,
                    },
                },
            });
        }

        // Calculate route with pickup (origin -> pickup -> destination)
        const withPickupResponse = await fetch(
            `https://maps.googleapis.com/maps/api/directions/json?` +
            new URLSearchParams({
                origin: `${origin.lat},${origin.lng}`,
                destination: `${destination.lat},${destination.lng}`,
                waypoints: `${pickup.lat},${pickup.lng}`,
                key: googleApiKey,
                mode: "driving",
                departure_time: "now",
            })
        );

        const withPickupData = await withPickupResponse.json();

        if (withPickupData.status !== "OK" || !withPickupData.routes?.[0]) {
            console.error("Route with pickup error:", withPickupData);
            return NextResponse.json(
                { error: "Failed to calculate route with pickup" },
                { status: 500 }
            );
        }

        // Sum up all legs (origin -> pickup and pickup -> destination)
        const withPickupRoute = withPickupData.routes[0];
        let totalDistance = 0;
        let totalDuration = 0;

        for (const leg of withPickupRoute.legs) {
            totalDistance += leg.distance.value;
            totalDuration += leg.duration.value;
        }

        // Calculate detour
        const detourDistance = totalDistance - directDistance;
        const detourDuration = totalDuration - directDuration;

        const result: RouteCalculation = {
            withPickup: {
                distanceMeters: totalDistance,
                durationSeconds: totalDuration,
            },
            withoutPickup: {
                distanceMeters: directDistance,
                durationSeconds: directDuration,
            },
            detour: {
                distanceMeters: detourDistance,
                durationSeconds: detourDuration,
            },
        };

        return NextResponse.json({
            success: true,
            data: {
                ...result,
                // Human-readable versions
                withPickupText: {
                    distance: `${(totalDistance / 1000).toFixed(1)} km`,
                    duration: formatDuration(totalDuration),
                },
                withoutPickupText: {
                    distance: directRoute.distance.text,
                    duration: directRoute.duration.text,
                },
                detourText: {
                    distance: `+${(detourDistance / 1000).toFixed(1)} km`,
                    duration: `+${formatDuration(detourDuration)}`,
                },
                // Is this an acceptable detour?
                isAcceptable: detourDistance <= 3000 && detourDuration <= 600, // 3km or 10min
            },
        });
    } catch (error) {
        console.error("Route calculation error:", error);
        return NextResponse.json(
            { error: "Failed to calculate route" },
            { status: 500 }
        );
    }
}

/**
 * Format duration in seconds to human readable string
 */
function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds} sec`;
    }
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
}
