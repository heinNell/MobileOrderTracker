// app/geofences/page.tsx - FULLY FEATURED WITH EDIT MODAL
"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Geofence } from "../../shared/types";

// Dynamic import
const GeofenceMap = dynamic(
  () => import("../../components/GeofenceMap").then((mod) => ({ default: mod.GeofenceMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

type Row = Partial<Geofence> & {
  location_text?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

function parseWKTPoint(wkt: string): { lat: number; lng: number } | null {
  if (!wkt || typeof wkt !== "string") return null;
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return null;
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function getCoords(row: Row) {
  if (row.location_text) {
    const parsed = parseWKTPoint(row.location_text);
    if (parsed) return parsed;
  }
  const lat = row.latitude != null ? Number(row.latitude) : null;
  const lng = row.longitude != null ? Number(row.longitude) : null;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Row | null>(null);

  const [newGeofence, setNewGeofence] = useState({
    name: "",
    latitude: -25.7479,
    longitude: 28.2293,
    radius_meters: 200,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    latitude: 0,
    longitude: 0,
    radius_meters: 200,
    is_active: true,
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>([-25.7479, 28.2293]);
  const [mapZoom, setMapZoom] = useState(6);

  const router = useRouter();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      fetchGeofences();
    };
    checkAuth();
  }, [router]);

  const fetchGeofences = async () => {
    try {
      const { data, error } = await supabase
        .from("geofences_api")
        .select("*")
        .order("name");

      if (error) throw error;
      setGeofences(data || []);

      const first = (data || []).map(getCoords).find(Boolean);
      if (first) {
        setMapCenter([first.lat, first.lng]);
        setMapZoom(12);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (showEditModal) {
      // If editing, update edit form
      setEditForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
    } else {
      // If creating new
      setNewGeofence(prev => ({ ...prev, latitude: lat, longitude: lng }));
    }
    setMapCenter([lat, lng]);
    setMapZoom(15);
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const { data: userRow } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("geofences").insert({
        tenant_id: userRow?.tenant_id,
        name: newGeofence.name.trim(),
        latitude: newGeofence.latitude,
        longitude: newGeofence.longitude,
        radius_meters: newGeofence.radius_meters,
        is_active: true,
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewGeofence({ name: "", latitude: -25.7479, longitude: 28.2293, radius_meters: 200 });
      fetchGeofences();
    } catch (err: any) {
      alert("Error creating geofence: " + (err.message || "Unknown"));
    }
  };

  const handleEditClick = (g: Row) => {
    const coords = getCoords(g);
    if (!coords) return;

    setEditForm({
      name: g.name || "",
      latitude: coords.lat,
      longitude: coords.lng,
      radius_meters: g.radius_meters || 200,
      is_active: !!g.is_active,
    });
    setEditingGeofence(g);
    setShowEditModal(true);
    setMapCenter([coords.lat, coords.lng]);
    setMapZoom(15);
  };

  const handleUpdateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGeofence?.id) return;

    try {
      const { error } = await supabase
        .from("geofences")
        .update({
          name: editForm.name.trim(),
          latitude: editForm.latitude,
          longitude: editForm.longitude,
          radius_meters: editForm.radius_meters,
          is_active: editForm.is_active,
        })
        .eq("id", editingGeofence.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingGeofence(null);
      fetchGeofences();
    } catch (err: any) {
      alert("Update failed: " + err.message);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("geofences").update({ is_active: !active }).eq("id", id);
    fetchGeofences();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this geofence permanently?")) return;
    await supabase.from("geofences").delete().eq("id", id);
    fetchGeofences();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Prevent hydration mismatch - don't render anything until mounted
  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">Loading geofences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Geofence Management</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Geofence
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        <p className="text-gray-600 mb-6 text-lg">
          Click on the map to place a geofence • Click Edit to modify
        </p>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <GeofenceMap
            center={mapCenter}
            zoom={mapZoom}
            geofences={geofences
              .map(g => {
                const c = getCoords(g);
                return c ? { ...g, latitude: c.lat, longitude: c.lng } : null;
              })
              .filter(Boolean) as any}
            onMapClick={handleMapClick}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">All Geofences</h2>
          </div>
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Radius</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {geofences.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No geofences yet. Click "+ New Geofence" to create one.
                  </td>
                </tr>
              ) : (
                geofences.map((g) => {
                  const coords = getCoords(g);
                  return (
                    <tr key={g.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{g.name || "Unnamed"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm">{g.radius_meters || "—"} m</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          g.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {g.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-4">
                        <button
                          onClick={() => handleEditClick(g)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(g.id as string, !!g.is_active)}
                          className={g.is_active ? "text-orange-600 hover:text-orange-800" : "text-green-600 hover:text-green-800"}
                        >
                          {g.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => handleDelete(g.id as string)}
                          className="text-red-600 hover:text-red-800"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">Create New Geofence</h2>
            <form onSubmit={handleCreateGeofence} className="space-y-5">
              <input
                type="text"
                placeholder="Geofence Name (e.g. Warehouse A)"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={newGeofence.name}
                onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  required
                  className="px-4 py-3 border rounded-lg"
                  value={newGeofence.latitude}
                  readOnly
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  required
                  className="px-4 py-3 border rounded-lg"
                  value={newGeofence.longitude}
                  readOnly
                />
              </div>
              <input
                type="number"
                placeholder="Radius in meters"
                min="50"
                required
                className="w-full px-4 py-3 border rounded-lg"
                value={newGeofence.radius_meters}
                onChange={(e) => setNewGeofence({ ...newGeofence, radius_meters: parseInt(e.target.value) || 200 })}
              />
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Create Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingGeofence && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6">Edit Geofence</h2>
            <form onSubmit={handleUpdateGeofence} className="space-y-5">
              <input
                type="text"
                placeholder="Name"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-4 py-3 border rounded-lg"
                    value={editForm.latitude}
                    onChange={(e) => setEditForm({ ...editForm, latitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-4 py-3 border rounded-lg"
                    value={editForm.longitude}
                    onChange={(e) => setEditForm({ ...editForm, longitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Radius (meters)</label>
                <input
                  type="number"
                  min="50"
                  required
                  className="w-full px-4 py-3 border rounded-lg"
                  value={editForm.radius_meters}
                  onChange={(e) => setEditForm({ ...editForm, radius_meters: parseInt(e.target.value) || 200 })}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="h-5 w-5 text-blue-600 rounded"
                />
                <label htmlFor="active" className="ml-3 text-lg">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingGeofence(null);
                  }}
                  className="px-6 py-3 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}