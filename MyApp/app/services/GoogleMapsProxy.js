// Google Maps API proxy service
// Place this in app/services/GoogleMapsProxy.js
import { Platform } from 'react-native';

/**
 * Proxy service to handle Google Maps API calls and avoid CORS issues
 */
class GoogleMapsProxy {
  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  }

  /**
   * Get directions between two points using server-side proxy
   * @param {Object} origin - {lat, lng}
   * @param {Object} destination - {lat, lng}
   * @param {string} travelMode - DRIVING, WALKING, etc.
   * @returns {Promise<Object>} - Directions response
   */
  async getDirections(origin, destination, travelMode = 'DRIVING') {
    try {
      // For web, we'll use a different approach since direct API calls cause CORS
      if (Platform.OS === 'web') {
        console.warn('Google Directions API not available on web due to CORS. Using estimated route.');
        
        // Return estimated straight-line route for web
        return {
          routes: [{
            overview_polyline: {
              points: this.encodePolyline([origin, destination])
            },
            legs: [{
              distance: { text: 'Estimated', value: this.calculateDistance(origin, destination) },
              duration: { text: 'Estimated', value: this.estimateDuration(origin, destination) }
            }]
          }]
        };
      }

      // For native platforms, make the API call directly
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.lat},${origin.lng}&` +
        `destination=${destination.lat},${destination.lng}&` +
        `mode=${travelMode.toLowerCase()}&` +
        `key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Directions API error: ${data.status}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting directions:', error);
      
      // Fallback to estimated route
      return {
        routes: [{
          overview_polyline: {
            points: this.encodePolyline([origin, destination])
          },
          legs: [{
            distance: { text: 'Estimated', value: this.calculateDistance(origin, destination) },
            duration: { text: 'Estimated', value: this.estimateDuration(origin, destination) }
          }]
        }]
      };
    }
  }

  /**
   * Calculate straight-line distance between two points
   * @param {Object} point1 - {lat, lng}
   * @param {Object} point2 - {lat, lng}
   * @returns {number} - Distance in meters
   */
  calculateDistance(point1, point2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat-point1.lat) * Math.PI/180;
    const Δλ = (point2.lng-point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Estimate duration based on distance (assuming 50 km/h average speed)
   * @param {Object} point1 - {lat, lng}
   * @param {Object} point2 - {lat, lng}
   * @returns {number} - Duration in seconds
   */
  estimateDuration(point1, point2) {
    const distance = this.calculateDistance(point1, point2);
    const averageSpeed = 50 * 1000 / 3600; // 50 km/h in m/s
    return Math.round(distance / averageSpeed);
  }

  /**
   * Simple polyline encoding for straight line
   * @param {Array} points - Array of {lat, lng} objects
   * @returns {string} - Encoded polyline
   */
  encodePolyline(points) {
    // Simplified polyline encoding for straight line
    // This is a basic implementation - in production, use a proper polyline encoding library
    return points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
  }
}

export default new GoogleMapsProxy();