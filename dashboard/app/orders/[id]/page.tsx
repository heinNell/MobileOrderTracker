// Order Detail Page - Comprehensive Order Information
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import type { Order, StatusUpdate, Incident, LocationUpdate } from "../../../../shared/types";
import { useRouter } from "next/navigation";
import { parsePostGISPoint } from "../../../../shared/locationUtils";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

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
    fetchOrderDetails();
    subscribeToUpdates();
  };

  const fetchOrderDetails = async () => {
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            phone
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) {
        throw new Error("Order not found");
      }

      setOrder(orderData);

      // Fetch status updates
      const { data: statusData, error: statusError } = await supabase
        .from("status_updates")
        .select(
          `
          *,
          driver:users!status_updates_driver_id_fkey(
            full_name
          )
        `
        )
        .eq("order_id", params.id)
        .order("created_at", { ascending: false });

      if (statusError) throw statusError;
      setStatusUpdates(statusData || []);

      // Fetch incidents
      const { data: incidentData, error: incidentError } = await supabase
        .from("incidents")
        .select(
          `
          *,
          driver:users!incidents_driver_id_fkey(
            full_name
          )
        `
        )
        .eq("order_id", params.id)
        .order("created_at", { ascending: false });

      if (incidentError) throw incidentError;
      setIncidents(incidentData || []);

      // Fetch location updates
      const { data: locationData, error: locationError } = await supabase
        .from("location_updates")
        .select("*")
        .eq("order_id", params.id)
        .order("timestamp", { ascending: false })
        .limit(20); // Limit to last 20 updates

      if (locationError) throw locationError;
      setLocationUpdates(locationData || []);
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    // Subscribe to order changes
    const orderChannel = supabase
      .channel(`order:${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    // Subscribe to status updates
    const statusChannel = supabase
      .channel(`status_updates:${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "status_updates",
          filter: `order_id=eq.${params.id}`,
        },
        (payload) => {
          setStatusUpdates((prev) => [payload.new as StatusUpdate, ...prev]);
        }
      )
      .subscribe();

    // Subscribe to incidents
    const incidentChannel = supabase
      .channel(`incidents:${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incidents",
          filter: `order_id=eq.${params.id}`,
        },
        (payload) => {
          setIncidents((prev) => [payload.new as Incident, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(incidentChannel);
    };
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: "bg-gray-500",
      assigned: "bg-blue-500",
      in_transit: "bg-purple-500",
      arrived: "bg-green-500",
      loading: "bg-yellow-500",
      loaded: "bg-green-500",
      unloading: "bg-yellow-500",
      completed: "bg-emerald-600",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getIncidentSeverityColor = (severity: number): string => {
    const colors = [
      "bg-gray-200",
      "bg-blue-200",
      "bg-yellow-200",
      "bg-orange-200",
      "bg-red-200",
      "bg-red-500 text-white",
    ];
    return colors[severity - 1] || "bg-gray-200";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Order not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Order Details</h1>
          <div className="flex items-center space-x-3">
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
            <div>
              <button
                onClick={() => router.push("/orders")}
                className="text-blue-600 hover:text-blue-800 flex items-center mb-2"
              >
                ← Back to Orders
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Order {order.order_number}
              </h1>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 hidden md:block"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 bg-white shadow rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
              <span
                className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Order Number</h3>
                <p className="text-lg font-medium">{order.order_number}</p>
              </div>
              {order.sku && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">SKU</h3>
                  <p className="text-lg font-medium">{order.sku}</p>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p className="text-lg font-medium">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              {order.assigned_driver && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Assigned Driver</h3>
                  <p className="text-lg font-medium">
                    {order.assigned_driver.full_name}
                    {order.assigned_driver.phone && (
                      <span className="text-gray-500 text-sm block">
                        {order.assigned_driver.phone}
                      </span>
                    )}
                  </p>
                </div>
              )}
              {order.actual_start_time && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Started</h3>
                  <p className="text-lg font-medium">
                    {new Date(order.actual_start_time).toLocaleString()}
                  </p>
                </div>
              )}
              {order.actual_end_time && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Completed</h3>
                  <p className="text-lg font-medium">
                    {new Date(order.actual_end_time).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Loading Point</h3>
                <p className="font-medium">{order.loading_point_name}</p>
                <p className="text-gray-600 text-sm">{order.loading_point_address}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Unloading Point</h3>
                <p className="font-medium">{order.unloading_point_name}</p>
                <p className="text-gray-600 text-sm">{order.unloading_point_address}</p>
              </div>
              {(order.estimated_distance_km || order.estimated_duration_minutes) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estimates</h3>
                  <div className="flex space-x-4">
                    {order.estimated_distance_km && (
                      <p className="font-medium">
                        {order.estimated_distance_km} km
                      </p>
                    )}
                    {order.estimated_duration_minutes && (
                      <p className="font-medium">
                        {order.estimated_duration_minutes} min
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        {(order.delivery_instructions || order.special_handling_instructions || order.contact_name) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {order.delivery_instructions && (
              <div className="md:col-span-2 bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Instructions</h2>
                <p className="text-gray-700">{order.delivery_instructions}</p>
              </div>
            )}
            {order.special_handling_instructions && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Special Handling</h2>
                <p className="text-gray-700">{order.special_handling_instructions}</p>
              </div>
            )}
            {order.contact_name && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
                <p className="font-medium">{order.contact_name}</p>
                {order.contact_phone && (
                  <p className="text-gray-600">{order.contact_phone}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status Updates */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Status Updates</h2>
          </div>
          <div className="p-6">
            {statusUpdates.length === 0 ? (
              <p className="text-gray-500">No status updates yet</p>
            ) : (
              <div className="space-y-4">
                {statusUpdates.map((update) => (
                  <div key={update.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex flex-wrap items-center justify-between">
                      <span
                        className={`px-2 py-1 rounded-full text-white text-xs font-semibold ${getStatusColor(
                          update.status
                        )}`}
                      >
                        {update.status.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(update.created_at).toLocaleString()}
                      </span>
                    </div>
                    {update.driver && (
                      <p className="text-sm text-gray-600 mt-1">
                        Updated by {update.driver.full_name}
                      </p>
                    )}
                    {update.notes && (
                      <p className="mt-2 text-gray-700">{update.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Incidents */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Incidents</h2>
          </div>
          <div className="p-6">
            {incidents.length === 0 ? (
              <p className="text-gray-500">No incidents reported</p>
            ) : (
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between mb-2">
                      <h3 className="font-medium">{incident.title}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getIncidentSeverityColor(
                          incident.severity
                        )}`}
                      >
                        Severity: {incident.severity}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3">{incident.description}</p>
                    <div className="flex flex-wrap items-center justify-between text-sm text-gray-500">
                      <span>
                        Reported by {incident.driver?.full_name} on{" "}
                        {new Date(incident.created_at).toLocaleString()}
                      </span>
                      {incident.is_resolved && (
                        <span className="text-green-600">Resolved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Location Updates */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Recent Location Updates</h2>
          </div>
          <div className="p-6">
            {locationUpdates.length === 0 ? (
              <p className="text-gray-500">No location updates yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Speed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accuracy
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locationUpdates.map((update) => (
                      <tr key={update.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(update.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {update.location.latitude.toFixed(6)}, {update.location.longitude.toFixed(6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {update.speed_kmh ? `${update.speed_kmh.toFixed(1)} km/h` : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {update.accuracy_meters ? `${update.accuracy_meters.toFixed(1)} m` : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}