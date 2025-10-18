// GeocodingService.js
// Replacement for deprecated Expo Location.geocodeAsync and reverseGeocodeAsync
// Uses Google Places API and Geocoding API as replacement

import Constants from 'expo-constants';

class GeocodingService {
  constructor() {
    this.apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
                  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Geocoding services will not work.');
    }
  }

  /**
   * Replacement for Location.geocodeAsync
   * Converts address to coordinates using Google Geocoding API
   */
  async geocodeAsync(address) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured for geocoding');
      return [];
    }

    if (!address || typeof address !== 'string') {
      console.warn('Invalid address provided to geocodeAsync:', address);
      return [];
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results.map(result => ({
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          accuracy: null, // Google Geocoding doesn't provide accuracy
          // Additional fields for compatibility
          street: this.extractAddressComponent(result, 'route'),
          city: this.extractAddressComponent(result, 'locality'),
          region: this.extractAddressComponent(result, 'administrative_area_level_1'),
          country: this.extractAddressComponent(result, 'country'),
          postalCode: this.extractAddressComponent(result, 'postal_code'),
          name: result.formatted_address
        }));
      } else {
        console.warn('Geocoding failed:', data.status, data.error_message);
        return [];
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  /**
   * Replacement for Location.reverseGeocodeAsync
   * Converts coordinates to address using Google Reverse Geocoding API
   */
  async reverseGeocodeAsync(location) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured for reverse geocoding');
      return [];
    }

    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      console.warn('Invalid location provided to reverseGeocodeAsync:', location);
      return [];
    }

    try {
      const { latitude, longitude } = location;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results.map(result => ({
          // Expo Location format compatibility
          street: this.extractAddressComponent(result, 'route'),
          city: this.extractAddressComponent(result, 'locality'),
          region: this.extractAddressComponent(result, 'administrative_area_level_1'), 
          country: this.extractAddressComponent(result, 'country'),
          postalCode: this.extractAddressComponent(result, 'postal_code'),
          name: result.formatted_address,
          isoCountryCode: this.extractAddressComponent(result, 'country', 'short_name'),
          // Additional Google-specific data
          formattedAddress: result.formatted_address,
          types: result.types,
          placeId: result.place_id
        }));
      } else {
        console.warn('Reverse geocoding failed:', data.status, data.error_message);
        return [];
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return [];
    }
  }

  /**
   * Enhanced address search using Google Places Autocomplete API
   * More accurate than basic geocoding for address suggestions
   */
  async searchPlaces(query, location = null) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured for place search');
      return [];
    }

    if (!query || typeof query !== 'string') {
      return [];
    }

    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${this.apiKey}`;
      
      // Add location bias if provided
      if (location && location.latitude && location.longitude) {
        url += `&location=${location.latitude},${location.longitude}&radius=50000`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        return data.predictions.map(prediction => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || '',
          secondaryText: prediction.structured_formatting?.secondary_text || '',
          types: prediction.types
        }));
      } else {
        console.warn('Place search failed:', data.status, data.error_message);
        return [];
      }
    } catch (error) {
      console.error('Place search error:', error);
      return [];
    }
  }

  /**
   * Get detailed place information from Place ID
   */
  async getPlaceDetails(placeId) {
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured for place details');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          street: this.extractAddressComponent(result, 'route'),
          city: this.extractAddressComponent(result, 'locality'),
          region: this.extractAddressComponent(result, 'administrative_area_level_1'),
          country: this.extractAddressComponent(result, 'country'),
          postalCode: this.extractAddressComponent(result, 'postal_code'),
          placeId: placeId
        };
      } else {
        console.warn('Place details failed:', data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error('Place details error:', error);
      return null;
    }
  }

  /**
   * Helper method to extract address components from Google API response
   */
  extractAddressComponent(result, type, nameType = 'long_name') {
    if (!result.address_components) return null;
    
    const component = result.address_components.find(comp => 
      comp.types.includes(type)
    );
    
    return component ? component[nameType] : null;
  }

  /**
   * Fallback method that tries to use coordinates from database first
   * then falls back to geocoding if needed
   */
  async getCoordinatesWithFallback(order) {
    // First try to use coordinates from database (new numeric fields)
    if (order.loading_point_latitude && order.loading_point_longitude) {
      return {
        loadingCoord: [{
          latitude: parseFloat(order.loading_point_latitude),
          longitude: parseFloat(order.loading_point_longitude)
        }],
        unloadingCoord: order.unloading_point_latitude && order.unloading_point_longitude ? [{
          latitude: parseFloat(order.unloading_point_latitude),
          longitude: parseFloat(order.unloading_point_longitude)
        }] : []
      };
    }

    // Fallback to geocoding if coordinates not available
    try {
      const [loadingCoord, unloadingCoord] = await Promise.all([
        order.loading_point_name ? this.geocodeAsync(order.loading_point_name) : Promise.resolve([]),
        order.unloading_point_name ? this.geocodeAsync(order.unloading_point_name) : Promise.resolve([])
      ]);

      return { loadingCoord, unloadingCoord };
    } catch (error) {
      console.error('Geocoding fallback failed:', error);
      return { loadingCoord: [], unloadingCoord: [] };
    }
  }

  /**
   * Check if geocoding service is available
   */
  isAvailable() {
    return !!this.apiKey;
  }
}

export default new GeocodingService();