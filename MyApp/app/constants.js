// app/constants.js
export const EXPO_MAPTILER_API_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY || '';
export const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${EXPO_MAPTILER_API_KEY}`;

// Create an object to hold all constants
const constants = {
  EXPO_MAPTILER_API_KEY,
  MAPTILER_STYLE_URL,
};

// Default export of the constants object
export default constants;
