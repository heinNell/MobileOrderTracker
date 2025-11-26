// components/GeofenceMap.tsx
"use client";

import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from "react-leaflet";
import { Icon, type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons (critical for Next.js)
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Geofence {
  id: number | string;
  name?: string | null;
  latitude: number;
  longitude: number;
  radius_meters?: number | null;
  is_active?: boolean | null;
}

interface GeofenceMapProps {
  center: LatLngTuple;
  zoom: number;
  geofences: Geofence[];
  onMapClick: (lat: number, lng: number) => void;
}

// Click handler component
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function GeofenceMap({ center, zoom, geofences, onMapClick }: GeofenceMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "520px", width: "100%", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onMapClick={onMapClick} />

      {geofences.map((g) => {
        const position: LatLngTuple = [g.latitude, g.longitude];

        return (
          <div key={g.id}>
            {/* Marker with nice popup */}
            <Marker
              position={position}
              icon={new Icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              })}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="block text-base">{g.name || "Unnamed Geofence"}</strong>
                  <span className="text-gray-600">
                    {g.latitude.toFixed(6)}, {g.longitude.toFixed(6)}
                  </span>
                  <br />
                  <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {g.radius_meters || "?"} m radius
                  </span>
                  <br />
                  <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                    g.is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {g.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </Popup>
            </Marker>

            {/* Geofence Circle */}
            {g.is_active && g.radius_meters && g.radius_meters > 0 && (
              <Circle
                center={position}
                radius={g.radius_meters}
                pathOptions={{
                  fillColor: "#3b82f6",
                  fillOpacity: 0.22,
                  color: "#2563eb",
                  weight: 3,
                  opacity: 0.9,
                }}
              />
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}