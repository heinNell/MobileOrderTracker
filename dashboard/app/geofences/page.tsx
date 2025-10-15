// Geofences Page - Geofence Configuration (hardened & fixed)
"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Geofence } from "../../shared/types";
// @ts-ignore
import { Circle, GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

type Row = Partial<Geofence> & {
  location?: unknown;
  location_text?: string; // Add this for WKT from API
  latitude?: number | string | null;
  longitude?: number | string | null;
};

// Updated WKT parser for "POINT(lng lat)" format
function parseWKTPoint(wkt: string): { lat: number; lng: number } | null {
  if (!wkt || typeof wkt !== "string") return null;

  // Match "POINT(lng lat)" format
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;

  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);

  if (Number.isFinite(lng) && Number.isFinite(lat)) {
    return { lat, lng };
  }
  return null;
}

function getCoords(row: Row) {
  // Try location_text (WKT) first
  if (row.location_text) {
    const parsed = parseWKTPoint(row.location_text);
    if (parsed) return parsed;
  }

  // Fallback to numeric columns
  const lat = row.latitude != null ? Number(row.latitude) : null;
  const lng = row.longitude != null ? Number(row.longitude) : null;

  if (
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  ) {
    return { lat, lng };
  }

  return null;
}

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGeofence, setNewGeofence] = useState({
    name: "",
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
  });
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);
  const router = useRouter();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const mapContainerStyle = useMemo(
    () => ({ width: "100%", height: "400px" }),
    []
  );
  const mapOptions = useMemo(
    () => ({
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
    }),
    []
  );

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }
    setUser(session.user);
    fetchGeofences();
  };

  const fetchGeofences = async () => {
    try {
      // Use the geofences_api view that includes location_text
      const { data, error } = await supabase
        .from("geofences_api")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      // Debug: stash rows for quick console inspection
      (window as any).__APP_DEBUG__ = (window as any).__APP_DEBUG__ || {};
      (window as any).__APP_DEBUG__.lastGeofences = data;

      setGeofences(data || []);

      // center map on first valid geofence, if any
      const firstWithCoords = (data || []).map(getCoords).find(Boolean) as
        | { lat: number; lng: number }
        | undefined;
      if (firstWithCoords) {
        setMapCenter(firstWithCoords);
        setMapZoom(12);
      }
    } catch (err) {
      console.error("Error fetching geofences:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure we have auth user
      if (!user?.id) throw new Error("Not authenticated");

      // Get user's tenant_id
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
      if (userError) throw userError;

      // Insert using numeric lat/lng (trigger will set location)
      const { error } = await supabase.from("geofences").insert({
        tenant_id: userRow.tenant_id,
        name: newGeofence.name,
        latitude: newGeofence.latitude,
        longitude: newGeofence.longitude,
        radius_meters: newGeofence.radius_meters,
        is_active: true,
      });
      if (error) throw error;

      setShowCreateModal(false);
      setNewGeofence({
        name: "",
        latitude: 0,
        longitude: 0,
        radius_meters: 100,
      });
      fetchGeofences();
    } catch (err) {
      console.error("Error creating geofence:", err);
      alert("Failed to create geofence");
    }
  };

  const handleToggleGeofenceStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("geofences")
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) throw error;
      fetchGeofences();
    } catch (err) {
      console.error("Error updating geofence status:", err);
      alert("Failed to update geofence status");
    }
  };

  const handleDeleteGeofence = async (id: string) => {
    if (!confirm("Are you sure you want to delete this geofence?")) return;
    try {
      const { error } = await supabase.from("geofences").delete().eq("id", id);
      if (error) throw error;
      fetchGeofences();
    } catch (err) {
      console.error("Error deleting geofence:", err);
      alert("Failed to delete geofence");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setNewGeofence((g) => ({ ...g, latitude: lat, longitude: lng }));
      setMapCenter({ lat, lng });
      setMapZoom(14);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading geofences...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Geofences</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
            >
              Add
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Geofence Management
          </h1>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hidden md:block"
            >
              Create Geofence
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 hidden md:block"
            >
              Logout
            </button>
          </div>
        </div>
        <p className="text-gray-600 mb-4">
          Define and manage geofences for location-based monitoring
        </p>

        {/* Map (only render if API key present) */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Geofence Map</h2>

          {apiKey ? (
            <LoadScript googleMapsApiKey={apiKey}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={mapZoom}
                options={mapOptions}
                onClick={handleMapClick}
              >
                {geofences.map((g) => {
                  const coords = getCoords(g);
                  if (!coords) return null;
                  return (
                    <React.Fragment key={String(g.id)}>
                      <Marker position={coords} title={g.name || ""} />
                      {g.is_active && g.radius_meters ? (
                        <Circle
                          center={coords}
                          radius={Number(g.radius_meters)}
                          options={{
                            fillColor: "#3B82F6",
                            fillOpacity: 0.2,
                            strokeColor: "#3B82F6",
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                          }}
                        />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </GoogleMap>
            </LoadScript>
          ) : (
            <div className="p-4 rounded border border-amber-300 bg-amber-50 text-amber-800">
              Google Maps API key is missing. Set{" "}
              <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
            </div>
          )}

          <p className="mt-3 text-sm text-gray-500">
            Click on the map to set the center point for a new geofence
          </p>
        </div>

        {/* List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Radius
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {geofences.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No geofences found
                    </td>
                  </tr>
                ) : (
                  geofences.map((g) => {
                    const coords = getCoords(g);
                    return (
                      <tr key={String(g.id)} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {g.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {coords && 
                           coords.lat !== undefined && 
                           coords.lng !== undefined
                            ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                            : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {g.radius_meters ?? "—"}{" "}
                          {g.radius_meters ? "meters" : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {g.is_active ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {"id" in g && typeof g.id === "string" ? (
                            <>
                              <button
                                onClick={() =>
                                  handleToggleGeofenceStatus(
                                    g.id as string,
                                    !!g.is_active
                                  )
                                }
                                className={`mr-3 ${
                                  g.is_active
                                    ? "text-red-600 hover:text-red-900"
                                    : "text-green-600 hover:text-green-900"
                                }`}
                              >
                                {g.is_active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteGeofence(g.id as string)
                                }
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400">Invalid row</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Geofence Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Create New Geofence
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateGeofence} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Geofence Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newGeofence.name}
                  onChange={(e) =>
                    setNewGeofence({ ...newGeofence, name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newGeofence.latitude}
                    onChange={(e) =>
                      setNewGeofence({
                        ...newGeofence,
                        latitude: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newGeofence.longitude}
                    onChange={(e) =>
                      setNewGeofence({
                        ...newGeofence,
                        longitude: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newGeofence.radius_meters}
                  onChange={(e) =>
                    setNewGeofence({
                      ...newGeofence,
                      radius_meters: parseInt(e.target.value) || 100,
                    })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
