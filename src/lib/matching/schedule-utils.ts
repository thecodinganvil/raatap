/**
 * Schedule Utilities
 * 
 * Time and schedule matching utilities for the Raatap matching system.
 */

const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

/**
 * Parse a time string (HH:MM or HH:MM:SS) to minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTimeString(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Find overlapping days between two schedules
 */
export function findOverlappingDays(
    days1: string[],
    days2: string[]
): string[] {
    const set1 = new Set(days1.map(d => d.toLowerCase()));
    return days2.filter(d => set1.has(d.toLowerCase()));
}

/**
 * Check if there is at least one overlapping day
 */
export function hasScheduleOverlap(
    days1: string[],
    days2: string[]
): boolean {
    return findOverlappingDays(days1, days2).length > 0;
}

/**
 * Estimate travel time based on distance
 * Uses a simple model assuming average speed
 * 
 * @param distanceMeters - Distance in meters
 * @param averageSpeedKmh - Average speed in km/h (default: 25 for city traffic)
 * @returns Estimated time in minutes
 */
export function estimateTravelTime(
    distanceMeters: number,
    averageSpeedKmh: number = 25
): number {
    const distanceKm = distanceMeters / 1000;
    const timeHours = distanceKm / averageSpeedKmh;
    return Math.ceil(timeHours * 60);
}

/**
 * Check if the host's departure time allows the rider to arrive on time
 * 
 * @param hostDepartureTime - When host leaves origin (HH:MM)
 * @param riderArrivalTime - When rider needs to arrive at destination (HH:MM)
 * @param estimatedTravelMins - Estimated travel time in minutes
 * @param flexibilityMins - Rider's flexibility window (+/- minutes)
 * @returns Whether times are compatible
 */
export function isTimeCompatible(
    hostDepartureTime: string,
    riderArrivalTime: string,
    estimatedTravelMins: number,
    flexibilityMins: number = 15
): { isCompatible: boolean; estimatedArrival: string; minutesDifference: number } {
    const departureMins = parseTimeToMinutes(hostDepartureTime);
    const desiredArrivalMins = parseTimeToMinutes(riderArrivalTime);

    // Calculate estimated arrival time
    const estimatedArrivalMins = departureMins + estimatedTravelMins;

    // Calculate difference from desired arrival
    const minutesDifference = estimatedArrivalMins - desiredArrivalMins;

    // Check if within flexibility window
    // Positive = arrives late, Negative = arrives early
    const isCompatible = Math.abs(minutesDifference) <= flexibilityMins;

    return {
        isCompatible,
        estimatedArrival: minutesToTimeString(estimatedArrivalMins),
        minutesDifference,
    };
}

/**
 * Calculate a schedule matching score (0-100)
 * Based on:
 * - Number of overlapping days
 * - How close the times align
 */
export function calculateScheduleScore(
    hostDays: string[],
    riderDays: string[],
    hostDepartureTime: string,
    riderArrivalTime: string,
    estimatedTravelMins: number,
    flexibilityMins: number = 15
): number {
    // Day overlap score (0-50)
    const overlappingDays = findOverlappingDays(hostDays, riderDays);
    const dayScore = (overlappingDays.length / Math.max(1, riderDays.length)) * 50;

    // Time compatibility score (0-50)
    const timeResult = isTimeCompatible(
        hostDepartureTime,
        riderArrivalTime,
        estimatedTravelMins,
        flexibilityMins
    );

    let timeScore = 0;
    if (timeResult.isCompatible) {
        // Score based on how close to exact time
        // At 0 difference = 50, at flexibility limit = 25
        timeScore = 50 - (Math.abs(timeResult.minutesDifference) / flexibilityMins) * 25;
    }

    return Math.max(0, Math.min(100, dayScore + timeScore));
}

/**
 * Format a time string for display (12-hour format)
 */
export function formatTimeDisplay(timeStr: string): string {
    const minutes = parseTimeToMinutes(timeStr);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format days array for display
 */
export function formatDaysDisplay(days: string[]): string {
    if (days.length === 7) {
        return 'Every day';
    }
    if (days.length === 5 &&
        days.every(d => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
            .map(day => day.toLowerCase())
            .includes(d.toLowerCase()))) {
        return 'Weekdays';
    }
    if (days.length === 2 &&
        days.every(d => ['Saturday', 'Sunday']
            .map(day => day.toLowerCase())
            .includes(d.toLowerCase()))) {
        return 'Weekends';
    }

    // Abbreviate days
    return days.map(d => d.substring(0, 3)).join(', ');
}

/**
 * Validate that days array contains valid day names
 */
export function validateDays(days: string[]): { isValid: boolean; invalidDays: string[] } {
    const validDays = new Set(DAYS_OF_WEEK.map(d => d.toLowerCase()));
    const invalidDays = days.filter(d => !validDays.has(d.toLowerCase()));

    return {
        isValid: invalidDays.length === 0,
        invalidDays,
    };
}

/**
 * Normalize day names to consistent format (capitalized)
 */
export function normalizeDays(days: string[]): string[] {
    const dayMap = new Map(DAYS_OF_WEEK.map(d => [d.toLowerCase(), d]));
    return days
        .map(d => dayMap.get(d.toLowerCase()))
        .filter((d): d is string => d !== undefined);
}

/**
 * Check if current time is within a time window
 */
export function isWithinTimeWindow(
    currentTime: string,
    windowStart: string,
    windowEnd: string
): boolean {
    const current = parseTimeToMinutes(currentTime);
    const start = parseTimeToMinutes(windowStart);
    const end = parseTimeToMinutes(windowEnd);

    // Handle overnight windows (e.g., 22:00 to 06:00)
    if (start > end) {
        return current >= start || current <= end;
    }

    return current >= start && current <= end;
}

/**
 * Get the next occurrence of a day from today
 */
export function getNextOccurrence(dayName: string): Date {
    const today = new Date();
    const todayIndex = today.getDay();
    const targetIndex = DAYS_OF_WEEK.indexOf(dayName);

    if (targetIndex === -1) {
        throw new Error(`Invalid day name: ${dayName}`);
    }

    // Convert Sunday = 0 to Sunday = 6 for our DAYS_OF_WEEK array
    const adjustedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;

    let daysUntil = targetIndex - adjustedTodayIndex;
    if (daysUntil <= 0) {
        daysUntil += 7;
    }

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return nextDate;
}
