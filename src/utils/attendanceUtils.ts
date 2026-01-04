// Coordinates for the Hostel
// Bharti Vidyapeeth Deemed To Be University College Of Engineering, Pune
export const HOSTEL_COORDINATES = {
    latitude: 18.513714,
    longitude: 73.819596,
};

// Start times and End times (24-hour format)
export const ATTENDANCE_SLOTS = {
    MORNING: { start: 7, end: 9 }, // 7 AM - 9 AM
    EVENING: { start: 20, end: 21.5 }, // 8 PM - 9:30 PM (21.5 = 21:30)
};

// Radius in meters
export const GEOFENCE_RADIUS = 80; // 100 meters

/**
 * Calculate distance between two points in meters using Haversine formula
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Check if current time is within any allowed attendance slot
 */
export const isWithinTimeSlot = (): { allowed: boolean; nextSlot?: string } => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // Check Morning Slot
    if (currentHour >= ATTENDANCE_SLOTS.MORNING.start && currentHour <= ATTENDANCE_SLOTS.MORNING.end) {
        return { allowed: true };
    }

    // Check Evening Slot
    if (currentHour >= ATTENDANCE_SLOTS.EVENING.start && currentHour <= ATTENDANCE_SLOTS.EVENING.end) {
        return { allowed: true };
    }

    // Determine next slot message
    if (currentHour < ATTENDANCE_SLOTS.MORNING.start) {
        return { allowed: false, nextSlot: "Morning (7 AM - 9 AM)" };
    } else if (currentHour > ATTENDANCE_SLOTS.MORNING.end && currentHour < ATTENDANCE_SLOTS.EVENING.start) {
        return { allowed: false, nextSlot: "Evening (8 PM - 9:30 PM)" };
    } else {
        return { allowed: false, nextSlot: "Tomorrow Morning (7 AM - 9 AM)" };
    }
};
