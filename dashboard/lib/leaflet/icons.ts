// lib/leaflet/icons.ts
import L from "leaflet";

// Fix default marker icons not showing in Next.js/Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/**
 * Custom Icons (using CDN - no need to host files)
 */
export const truckIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/32/3075/3075975.png",
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

export const loadingIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/32/854/854877.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export const unloadingIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/32/3062/3062619.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export const geofenceIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/32/854/854875.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

/**
 * Colored dot marker
 */
export const createColoredMarker = (color: string, size = 32): L.DivIcon => {
  return new L.DivIcon({
    className: "custom-colored-marker",
    html: `<div style="
      width:${size}px;
      height:${size}px;
      background:${color};
      border:3px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/**
 * Labeled marker (e.g. order number)
 */
export const createLabeledMarker = (label: string, color = "#3b82f6"): L.DivIcon => {
  return new L.DivIcon({
    className: "custom-labeled-marker",
    html: `<div style="
      background:${color};
      color:white;
      padding:6px 12px;
      border-radius:20px;
      font-weight:bold;
      font-size:14px;
      border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};