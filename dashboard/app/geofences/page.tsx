// Geofences Page - Geofence Configuration
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Geofence } from "../../../shared/types";
import { useRouter } from "next/navigation";
import { parsePostGISPoint, toPostGISPoint } from "../../../shared/locationUtils";
// @ts-ignore
import { GoogleMap, LoadScript, Marker, Circle } from "@react-google-maps/api";

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [newGeofence, setNewGeofence] = useState({
    name: "",
    latitude: 0,
    longitude: 0,
    radius_meters: 100,
  });
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);
  const router = useRouter();

  // Map container style
  const mapContainerStyle = {
    width: "100%",
    height: "400px",
  };

  // Default map options
  const mapOptions = {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
  };

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
      const { data, error } = await supabase
        .from("geofences")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      setGeofences(data || []);
      
      // Set initial map center to first geofence if available
      if (data && data.length > 0) {
        const firstGeofence = data[0];
        const location = parsePostGISPoint(firstGeofence.location);
        setMapCenter({
          lat: location.latitude,
          lng: location.longitude,
        });
        setMapZoom(12);
      }
    } catch (error) {
      console.error("Error fetching geofences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { error } = await supabase
        .from("geofences")
        .insert({
          tenant_id: userData.tenant_id,
          name: newGeofence.name,
          location: toPostGISPoint({
            latitude: newGeofence.latitude,
            longitude: newGeofence.longitude,
          }),
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
      
      // Refresh geofences
      fetchGeofences();
    } catch (error) {
      console.error("Error creating geofence:", error);
      alert("Failed to create geofence");
    }
  };

  const handleToggleGeofenceStatus = async (geofenceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("geofences")
        .update({ is_active: !currentStatus })
        .eq("id", geofenceId);

      if (error) throw error;

      // Refresh geofences
      fetchGeofences();
    } catch (error) {
      console.error("Error updating geofence status:", error);
      alert("Failed to update geofence status");
    }
  };

  const handleDeleteGeofence = async (geofenceId: string) => {
    if (!confirm("Are you sure you want to delete this geofence?")) return;

    try {
      const { error } = await supabase
        .from("geofences")
        .delete()
        .eq("id", geofenceId);

      if (error) throw error;

      // Refresh geofences
      fetchGeofences();
    } catch (error) {
      console.error("Error deleting geofence:", error);
      alert("Failed to delete geofence");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setNewGeofence({
        ...newGeofence,
        latitude: e.latLng.lat(),
        longitude: e.latLng.lng(),
      });
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
      {/* Mobile header */}
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

      {/* Main content */}
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Geofence Management</h1>
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
          <p className="text-gray-600 mt-2">
            Define and manage geofences for location-based monitoring
          </p>
        </div>

        {/* Map View */}
        <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Geofence Map</h2>
          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={mapOptions}
              onClick={handleMapClick}
            >
              {geofences.map((geofence) => {
                const location = parsePostGISPoint(geofence.location);
                return (
                  <React.Fragment key={geofence.id}>
                    <Marker
                      position={{ lat: location.latitude, lng: location.longitude }}
                      title={geofence.name}
                    />
                    {geofence.is_active && (
                      <Circle
                        center={{ lat: location.latitude, lng: location.longitude }}
                        radius={geofence.radius_meters}
                        options={{
                          fillColor: "#3B82F6",
                          fillOpacity: 0.2,
                          strokeColor: "#3B82F6",
                          strokeOpacity: 0.8,
                          strokeWeight: 2,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </GoogleMap>
          </LoadScript>
          <p className="mt-3 text-sm text-gray-500">
            Click on the map to set the center point for a new geofence
          </p>
        </div>

        {/* Geofences List */}
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
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No geofences found
                    </td>
                  </tr>
                ) : (
                  geofences.map((geofence) => {
                    const location = parsePostGISPoint(geofence.location);
                    return (
                      <tr key={geofence.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {geofence.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {geofence.radius_meters} meters
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {geofence.is_active ? (
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
                          <button
                            onClick={() => handleToggleGeofenceStatus(geofence.id, geofence.is_active)}
                            className={`mr-3 ${
                              geofence.is_active
                                ? "text-red-600 hover:text-red-900"
                                : "text-green-600 hover:text-green-900"
                            }`}
                          >
                            {geofence.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => handleDeleteGeofence(geofence.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
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
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Create New Geofence
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                  onChange={(e) => setNewGeofence({...newGeofence, name: e.target.value})}
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
                    onChange={(e) => setNewGeofence({...newGeofence, latitude: parseFloat(e.target.value) || 0})}
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
                    onChange={(e) => setNewGeofence({...newGeofence, longitude: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radius (meters)
                </label>
                <input
                  type="number"
                  min="10"
                  max="10000"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newGeofence.radius_meters}
                  onChange={(e) => setNewGeofence({...newGeofence, radius_meters: parseInt(e.target.value) || 100})}
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