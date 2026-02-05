/**
 * Matching Library Index
 * 
 * Export all matching-related utilities and types
 */

// Types
export type {
    Coordinates,
    Location,
    Profile,
    VehicleType,
    GenderPreference,
    TemplateStatus,
    RideTemplate,
    CreateRideTemplateInput,
    VehiclePreference,
    RequestStatus,
    RideRequest,
    CreateRideRequestInput,
    PodStatus,
    Pod,
    MemberStatus,
    PodMember,
    SuggestionStatus,
    MatchSuggestion,
    MatchCriteria,
    MatchResult,
    ApiResponse,
    PaginatedResponse,
    RouteCalculation,
    MatchSuggestionWithDetails,
    PodWithMembers,
} from './types';

// Route utilities
export {
    calculateDistance,
    calculateBearing,
    isSameDirection,
    distanceToLine,
    isPickupOnRoute,
    calculateDetourDistance,
    calculateRouteScore,
    formatDistance,
    isSameDestination,
} from './route-utils';

// Schedule utilities
export {
    parseTimeToMinutes,
    minutesToTimeString,
    findOverlappingDays,
    hasScheduleOverlap,
    estimateTravelTime,
    isTimeCompatible,
    calculateScheduleScore,
    formatTimeDisplay,
    formatDaysDisplay,
    validateDays,
    normalizeDays,
    isWithinTimeWindow,
    getNextOccurrence,
} from './schedule-utils';

// Matching algorithm
export {
    findMatchesForRequest,
    createMatchSuggestions,
    getHostSuggestions,
    acceptSuggestion,
    skipSuggestion,
    confirmPodMembership,
    calculateMatchStats,
} from './algorithm';
