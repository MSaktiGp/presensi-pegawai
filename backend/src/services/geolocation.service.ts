import { CONFIG } from '../config/constants';

/**
 * Calculate distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Calculate distance from office location.
 * Server ALWAYS recalculates — never trust client-side distance.
 */
export const calculateDistanceFromOffice = (lat: number, lng: number): number => {
  return calculateDistance(lat, lng, CONFIG.OFFICE_LAT, CONFIG.OFFICE_LNG);
};

/**
 * Check if coordinates are within the allowed radius from office.
 */
export const isWithinRadius = (lat: number, lng: number): { within: boolean; distance: number } => {
  const distance = calculateDistanceFromOffice(lat, lng);
  return {
    within: distance <= CONFIG.MAX_RADIUS_METERS,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
  };
};
