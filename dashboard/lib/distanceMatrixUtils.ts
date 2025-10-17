/**
 * Distance Matrix API Utilities
 * Provides real-time distance and duration calculations using Google Distance Matrix API
 */

export interface DistanceMatrixRequest {
  origins: string[];
  destinations: string[];
  mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
  language?: string;
  units?: 'metric' | 'imperial';
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
}

export interface DistanceMatrixElement {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  duration_in_traffic?: {
    text: string;
    value: number; // in seconds
  };
  status: string;
}

export interface DistanceMatrixResponse {
  origin_addresses: string[];
  destination_addresses: string[];
  rows: {
    elements: DistanceMatrixElement[];
  }[];
  status: string;
}

/**
 * Calculate distance and duration using Google Distance Matrix API
 * This uses the client-side API through Google Maps JavaScript library
 */
export async function calculateDistanceMatrix(
  origins: google.maps.LatLngLiteral[],
  destinations: google.maps.LatLngLiteral[],
  mode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
): Promise<DistanceMatrixElement | null> {
  return new Promise((resolve, reject) => {
    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: origins.map(coord => new google.maps.LatLng(coord.lat, coord.lng)),
        destinations: destinations.map(coord => new google.maps.LatLng(coord.lat, coord.lng)),
        travelMode: mode,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
      },
      (response, status) => {
        if (status === google.maps.DistanceMatrixStatus.OK && response) {
          const element = response.rows[0]?.elements[0];
          if (element && element.status === 'OK') {
            resolve({
              distance: element.distance,
              duration: element.duration,
              duration_in_traffic: element.duration_in_traffic,
              status: element.status,
            });
          } else {
            reject(new Error(`Distance Matrix element status: ${element?.status}`));
          }
        } else {
          reject(new Error(`Distance Matrix API error: ${status}`));
        }
      }
    );
  });
}

/**
 * Calculate ETA based on distance matrix data
 */
export function calculateETAFromDistanceMatrix(
  distanceElement: DistanceMatrixElement,
  currentTime: Date = new Date()
): {
  arrivalTime: Date;
  durationMinutes: number;
  distanceKm: number;
  averageSpeedKmh: number;
} {
  const durationSeconds = distanceElement.duration_in_traffic?.value || distanceElement.duration.value;
  const distanceMeters = distanceElement.distance.value;

  const durationMinutes = Math.round(durationSeconds / 60);
  const distanceKm = distanceMeters / 1000;
  const averageSpeedKmh = (distanceKm / (durationSeconds / 3600));

  const arrivalTime = new Date(currentTime.getTime() + durationSeconds * 1000);

  return {
    arrivalTime,
    durationMinutes,
    distanceKm,
    averageSpeedKmh,
  };
}

/**
 * Format distance for display
 */
export function formatDistanceFromMatrix(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDurationFromMatrix(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Get color coding for ETA based on traffic conditions
 */
export function getETAColorClass(
  normalDuration: number,
  trafficDuration?: number
): string {
  if (!trafficDuration) return 'text-gray-900';

  const delayRatio = trafficDuration / normalDuration;

  if (delayRatio > 1.5) return 'text-red-600'; // Significant delay
  if (delayRatio > 1.2) return 'text-orange-600'; // Moderate delay
  if (delayRatio > 1.1) return 'text-yellow-600'; // Light delay
  return 'text-green-600'; // Good traffic
}

/**
 * Calculate if driver is running ahead or behind schedule
 */
export function calculateScheduleVariance(
  estimatedDuration: number,
  actualDuration: number
): {
  variance: number; // in minutes
  status: 'ahead' | 'on-time' | 'behind';
  percentage: number;
} {
  const varianceMinutes = (actualDuration - estimatedDuration) / 60;
  const percentage = ((actualDuration - estimatedDuration) / estimatedDuration) * 100;

  let status: 'ahead' | 'on-time' | 'behind';
  if (Math.abs(varianceMinutes) < 5) {
    status = 'on-time';
  } else if (varianceMinutes < 0) {
    status = 'ahead';
  } else {
    status = 'behind';
  }

  return {
    variance: Math.abs(varianceMinutes),
    status,
    percentage: Math.abs(percentage),
  };
}
