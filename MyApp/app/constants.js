// app/constants.js
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyAhoyKz_MWD2hoesNvhP1ofEP4SZl3dxtg';
export const GOOGLE_MAPS_API_URL = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;

// Create an object to hold all constants
const constants = {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_API_URL,
};

// Default export of the constants object
export default constants;
