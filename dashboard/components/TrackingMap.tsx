// components/TrackingMap.tsx
"use client";

import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { Icon, type LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix Leaflet default marker icons once
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapController({ center, zoom }: { center: LatLngTuple; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function TrackingMap({
  center,
  zoom,
  orders,
  selectedOrder,
  enhancedRoutes,
  getOrderCoordinates,
  isValidCoordinate,
}: any) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
      />
      <MapController center={center} zoom={zoom} />

      {orders.map((order: any) => {
        const { loadingPoint, unloadingPoint } = getOrderCoordinates(order);
        const route = enhancedRoutes[order.id];

        const loadingPos = isValidCoordinate(loadingPoint) ? [loadingPoint.lat, loadingPoint.lng] as LatLngTuple : null;
        const unloadingPos = isValidCoordinate(unloadingPoint) ? [unloadingPoint.lat, unloadingPoint.lng] as LatLngTuple : null;

        return (
          <div key={order.id}>
            {/* Loading Point */}
            {loadingPos && (
              <Marker position={loadingPos}>
                <Popup>
                  <strong>Loading Point</strong><br />
                  {order.loading_point_name}
                </Popup>
              </Marker>
            )}

            {/* Unloading Point */}
            {unloadingPos && (
              <Marker position={unloadingPos}>
                <Popup>
                  <strong>Unloading Point</strong><br />
                  {order.unloading_point_name}
                </Popup>
              </Marker>
            )}

            {/* Planned Route (Gray dashed) */}
            {route?.plannedRoute?.length > 1 && (
              <Polyline
                positions={route.plannedRoute.map((p: any) => [p.lat, p.lng])}
                color="#6b7280"
                weight={4}
                opacity={0.6}
                dashArray="10,10"
              />
            )}

            {/* Completed Route (Green) */}
            {route?.completedRoute?.length > 1 && (
              <Polyline
                positions={route.completedRoute.map((p: any) => [p.lat, p.lng])}
                color="#10b981"
                weight={7}
                opacity={0.9}
              />
            )}

            {/* Remaining Route (Red) */}
            {route?.remainingRoute?.length > 1 && (
              <Polyline
                positions={route.remainingRoute.map((p: any) => [p.lat, p.lng])}
                color="#ef4444"
                weight={7}
                opacity={0.9}
              />
            )}

            {/* Current Vehicle Position */}
            {route?.currentPosition && isValidCoordinate(route.currentPosition) && (
              <Marker
                position={[route.currentPosition.lat, route.currentPosition.lng]}
                icon={new Icon({
                  iconUrl: "https://cdn-icons-png.flaticon.com/32/3075/3075975.png",
                  iconSize: [40, 40],
                  iconAnchor: [20, 40],
                })}
              >
                <Popup>
                  <strong>{order.order_number}</strong><br />
                  Driver: {order.assigned_driver?.full_name || "Unknown"}<br />
                  Progress: {route.progressPercentage.toFixed(1)}%
                </Popup>
              </Marker>
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}