// app/components/map/MapComponent.js
// This file should NOT be used directly
// The bundler should resolve to MapComponent.web.js or MapComponent.native.js

// If this file is loaded, it means the platform-specific resolution failed
// Return a safe empty component to prevent crashes

const MapComponent = () => {
  console.warn('MapComponent.js fallback loaded - platform-specific file should have been used');
  return null;
};

export default MapComponent;
