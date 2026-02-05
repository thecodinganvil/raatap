import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/locations/details
 * 
 * Get place details (coordinates) from Google Place ID
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get("place_id");

    if (!placeId) {
        return NextResponse.json(
            { error: "place_id is required" },
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

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?` +
            new URLSearchParams({
                place_id: placeId,
                key: googleApiKey,
                fields: "geometry,formatted_address,name",
            })
        );

        const data = await response.json();

        if (data.status !== "OK" || !data.result?.geometry?.location) {
            console.error("Place details error:", data);
            return NextResponse.json(
                { error: "Failed to get place details" },
                { status: 500 }
            );
        }

        const { lat, lng } = data.result.geometry.location;

        return NextResponse.json({
            lat,
            lng,
            formatted_address: data.result.formatted_address,
            name: data.result.name,
        });
    } catch (error) {
        console.error("Place details error:", error);
        return NextResponse.json(
            { error: "Failed to get place details" },
            { status: 500 }
        );
    }
}
