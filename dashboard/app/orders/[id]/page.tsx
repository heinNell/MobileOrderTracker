"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { exportOrderToPDF } from "../../../lib/pdf-export";
import { supabase } from "../../../lib/supabase";
import { handleApiError, handleSuccess } from "../../../lib/utils";
import type { Order } from "../../../shared/types";
import EnhancedOrderForm from "../../components/EnhancedOrderForm";

// Define local interfaces for type safety
interface LocationPoint {
  latitude: number;
  longitude: number;
}

interface StatusUpdate {
  id: string;
  order_id: string;
  status: string;
  notes?: string;
  created_at: string;
  driver?: {
    full_name: string;
  };
}

interface Incident {
  id: string;
  order_id: string;
  title: string;
  description: string;
  severity: number;
  is_resolved: boolean;
  created_at: string;
  driver?: {
    full_name: string;
  };
}

interface LocationUpdate {
  id: string;
  order_id: string;
  location?: {
    lat: number;
    lng: number;
  }; // JSONB format
  latitude?: number; // Separate columns
  longitude?: number;
  speed_kmh?: number;
  accuracy_meters?: number;
  speed?: number; // Alternative column names
  accuracy?: number;
  heading?: number;
  timestamp: string;
  created_at: string;
  is_manual_update?: boolean;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [locationUpdates, setLocationUpdates] = useState<LocationUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [orderId, setOrderId] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const initializePage = async () => {
      const resolvedParams = await params;
      setOrderId(resolvedParams.id);
      await checkAuth();
    };
    initializePage();
  }, [params]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);
  };

  // Fetch data when orderId is available
  useEffect(() => {
    if (orderId && user) {
      fetchOrderData();
      subscribeToUpdates();
    }
  }, [orderId, user]);

  const fetchOrderData = async () => {
    if (!orderId) return;
    
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
        .eq("id", orderId)
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
        .eq("order_id", orderId)
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
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (incidentError) throw incidentError;
      setIncidents(incidentData || []);

      // Fetch location updates (driver locations)
      // First try with order_id filter, then fallback to driver_id if order has assigned driver
      let locationData = [];
      let locationError = null;
      
      // Try to fetch locations by order_id
      const { data: locationsByOrder, error: orderLocationError } = await supabase
        .from("driver_locations")
        .select(`
          *,
          driver:users!driver_locations_driver_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(20);
        
      if (orderLocationError) {
        console.error("Error fetching locations by order_id:", orderLocationError);
      } else if (locationsByOrder && locationsByOrder.length > 0) {
        locationData = locationsByOrder;
      }
      
      // If no locations found by order_id and order has assigned driver, try driver_id
      if (locationData.length === 0 && orderData.assigned_driver_id) {
        const { data: locationsByDriver, error: driverLocationError } = await supabase
          .from("driver_locations")
          .select(`
            *,
            driver:users!driver_locations_driver_id_fkey(
              id,
              full_name,
              email
            )
          `)
          .eq("driver_id", orderData.assigned_driver_id)
          .order("created_at", { ascending: false })
          .limit(20);
          
        if (driverLocationError) {
          console.error("Error fetching locations by driver_id:", driverLocationError);
          locationError = driverLocationError;
        } else {
          locationData = locationsByDriver || [];
        }
      }
      
      if (locationError && locationData.length === 0) {
        throw locationError;
      }
      
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
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    // Subscribe to status updates
    const statusChannel = supabase
      .channel(`status_updates:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "status_updates",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setStatusUpdates((prev) => [payload.new as StatusUpdate, ...prev]);
        }
      )
      .subscribe();

    // Subscribe to incidents
    const incidentChannel = supabase
      .channel(`incidents:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incidents",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setIncidents((prev) => [payload.new as Incident, ...prev]);
        }
      )
      .subscribe();

    // Subscribe to location updates (driver locations) - by order_id
    const locationChannel = supabase
      .channel(`driver_locations:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_locations",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log("New location update received (by order_id):", payload.new);
          setLocationUpdates((prev) => [payload.new as LocationUpdate, ...prev.slice(0, 19)]); // Keep last 20
        }
      )
      .subscribe();
      
    // Also subscribe to driver location updates if driver is assigned
    let driverLocationChannel: any = null;
    if (order?.assigned_driver_id) {
      driverLocationChannel = supabase
        .channel(`driver_locations_driver:${order.assigned_driver_id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "driver_locations",
            filter: `driver_id=eq.${order.assigned_driver_id}`,
          },
          (payload) => {
            console.log("New location update received (by driver_id):", payload.new);
            // Only add if not already in the list (avoid duplicates if order_id is also set)
            setLocationUpdates((prev) => {
              const exists = prev.some(loc => loc.id === (payload.new as LocationUpdate).id);
              if (!exists) {
                return [payload.new as LocationUpdate, ...prev.slice(0, 19)];
              }
              return prev;
            });
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(incidentChannel);
      supabase.removeChannel(locationChannel);
      if (driverLocationChannel) {
        supabase.removeChannel(driverLocationChannel);
      }
    };
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: "bg-gray-500",
      assigned: "bg-blue-500",
      activated: "bg-green-500",
      in_progress: "bg-indigo-500",
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
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      handleApiError(error, "Failed to logout");
      // Force redirect even if signOut fails
      router.push("/login");
    }
  };

  const handleExportToPDF = async () => {
    if (!order) return;

    try {
      setLoading(true);
      await exportOrderToPDF(order, {
        includeQR: true,
        includeTransporter: true,
        companyName: "Matanuska Load Confirmation",
      });
      handleSuccess("PDF exported successfully!");
    } catch (error: any) {
      handleApiError(error, "Failed to export PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async (orderData: Partial<Order>) => {
    if (!order) return;

    try {
      setLoading(true);
      
      // If assigning a driver and status is still pending, automatically update to assigned
      if (orderData.assigned_driver_id && order.status === 'pending') {
        orderData.status = 'assigned';
      }
      
      // Update order with the new data
      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update({
          ...orderData,
          updated_at: new Date().toISOString()
        })
        .eq("id", order.id)
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update order: ${error.message}`);
      }

      if (updatedOrder) {
        setOrder(updatedOrder);
        
        // If driver was assigned, send notification
        if (orderData.assigned_driver_id) {
          try {
            const { error: notifError } = await supabase
              .from("notifications")
              .insert([{
                title: "Order Assignment",
                message: `You have been assigned to order ${order.order_number}`,
                user_id: orderData.assigned_driver_id,
                type: "order_assignment",
                created_at: new Date().toISOString(),
                order_id: order.id
              }]);
            
            if (notifError) {
              console.warn("Failed to send notification:", notifError);
            }
          } catch (notifError) {
            console.warn("Notification error:", notifError);
          }
        }
        
        // Refresh order data to get latest status updates
        await fetchOrderData();
      }

      handleSuccess("Order updated successfully!");
      setShowEditModal(false);
    } catch (error: any) {
      handleApiError(error, "Failed to update order");
    } finally {
      setLoading(false);
    }
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
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Edit Order
              </button>
              <button
                onClick={handleExportToPDF}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Export PDF
              </button>
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
                <h3 className="text-sm font-medium text-gray-500">
                  Order Number
                </h3>
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
                  <h3 className="text-sm font-medium text-gray-500">
                    Assigned Driver
                  </h3>
                  <p className="text-lg font-medium">
                    {order.assigned_driver.full_name}
                    {order.assigned_driver &&
                      "phone" in order.assigned_driver &&
                      order.assigned_driver.phone && (
                        <span className="text-gray-500 text-sm block">
                          {String(order.assigned_driver.phone as string | number)}
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
                  <h3 className="text-sm font-medium text-gray-500">
                    Completed
                  </h3>
                  <p className="text-lg font-medium">
                    {new Date(order.actual_end_time).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delivery Information
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Loading Point
                </h3>
                <p className="font-medium">{order.loading_point_name}</p>
                <p className="text-gray-600 text-sm">
                  {order.loading_point_address}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Unloading Point
                </h3>
                <p className="font-medium">{order.unloading_point_name}</p>
                <p className="text-gray-600 text-sm">
                  {order.unloading_point_address}
                </p>
              </div>
              {(order.estimated_distance_km ||
                order.estimated_duration_minutes) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Estimates
                  </h3>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Transporter Supplier Information */}
          {order.transporter_supplier && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Transporter Supplier
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Company Name
                  </h3>
                  <p className="font-medium">
                    {order.transporter_supplier.name}
                  </p>
                </div>
                {order.transporter_supplier.contact_phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                    <p className="text-gray-700">
                      {order.transporter_supplier.contact_phone}
                    </p>
                  </div>
                )}
                {order.transporter_supplier.contact_email && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="text-gray-700">
                      {order.transporter_supplier.contact_email}
                    </p>
                  </div>
                )}
                {order.transporter_supplier.cost_amount &&
                  order.transporter_supplier.cost_currency && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Cost
                      </h3>
                      <p className="font-medium text-green-600">
                        {order.transporter_supplier.cost_currency}{" "}
                        {order.transporter_supplier.cost_amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                {order.transporter_supplier.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                    <p className="text-gray-700">
                      {order.transporter_supplier.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {order.contact_name && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Contact Information
              </h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Contact Name
                  </h3>
                  <p className="font-medium">{order.contact_name}</p>
                </div>
                {order.contact_phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                    <p className="text-gray-700">{order.contact_phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        {(order.delivery_instructions ||
          order.special_handling_instructions) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {order.delivery_instructions && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Delivery Instructions
                </h2>
                <p className="text-gray-700">{order.delivery_instructions}</p>
              </div>
            )}
            {order.special_handling_instructions && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Special Handling
                </h2>
                <p className="text-gray-700">
                  {order.special_handling_instructions}
                </p>
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
                  <div
                    key={update.id}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
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
                  <div
                    key={incident.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
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
            <h2 className="text-xl font-bold text-gray-900">
              Recent Location Updates
            </h2>
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
                          {update.latitude && update.longitude ? (
                            `${update.latitude.toFixed(6)}, ${update.longitude.toFixed(6)}`
                          ) : update.location?.lat && update.location?.lng ? (
                            `${update.location.lat.toFixed(6)}, ${update.location.lng.toFixed(6)}`
                          ) : "Location unavailable"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {update.speed_kmh
                            ? `${update.speed_kmh.toFixed(1)} km/h`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {update.accuracy_meters
                            ? `${update.accuracy_meters.toFixed(1)} m`
                            : "N/A"}
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

      {/* Edit Order Modal */}
      {showEditModal && order && (
        <EnhancedOrderForm
          order={order}
          onSubmit={handleUpdateOrder}
          onCancel={() => setShowEditModal(false)}
          isEditing={true}
        />
      )}
    </div>
  );
}
