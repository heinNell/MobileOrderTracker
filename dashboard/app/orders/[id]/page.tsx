"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import StatusManagement from "../../../components/StatusManagement";
import { supabase } from "../../../lib/supabase";
import type { Order } from "../../../shared/types";

interface StatusUpdate {
  id: string;
  order_id: string;
  status: string;  // Actual column name in schema
  driver_id: string;  // Actual column name in schema
  created_at: string;  // Actual column name in schema
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  metadata?: any;
  driver?: {  // Joined from users table
    full_name: string;
    email: string;
  };
}

// Updated interface to match Next.js App Router expectations
interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const router = useRouter();

  // Resolve params Promise
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setOrderId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  const checkAuth = async () => {
    if (!orderId) return; // Wait for orderId to be resolved
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      await fetchOrderDetails();
      await fetchStatusUpdates();
      subscribeToUpdates();
    } catch (error: any) {
      console.error("Auth check failed:", error);
      toast.error("Authentication failed");
      router.push("/login");
    }
  };

  useEffect(() => {
    if (orderId) {
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    try {
      setLoading(true);

      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      // Get user's tenant_id  
      const { data: userData } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!userData?.tenant_id) {
        throw new Error("User not linked to any organization");
      }

      // Fetch order with driver information
      const { data: orderData, error } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq("id", orderId)
        .eq("tenant_id", userData.tenant_id)
        .maybeSingle();

      if (error) throw error;

      if (!orderData) {
        throw new Error("Order not found or access denied");
      }

      setOrder(orderData);
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      toast.error(error.message || "Failed to fetch order details");
      router.push("/orders");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  const fetchStatusUpdates = useCallback(async () => {
    if (!orderId) return;
    
    try {
      // Fetch from status_updates table if it exists
      const { data: updates, error } = await supabase
        .from("status_updates")
        .select(`
          id,
          order_id,
          status,
          notes,
          location,
          metadata,
          created_at,
          driver_id,
          driver:users!status_updates_driver_id_fkey(
            full_name,
            email
          )
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error && error.code !== "42P01") { // Ignore table doesn't exist error
        throw error;
      }

      // If status_updates table doesn't exist, try to get updates from order_status_history
      if (!updates || error?.code === "42P01") {
        const { data: historyUpdates, error: historyError } = await supabase
          .from("order_status_history")
          .select(`
            id,
            order_id,
            previous_status,
            new_status,
            changed_by,
            changed_at,
            notes,
            driver_location,
            metadata,
            changed_by_user:users!order_status_history_changed_by_fkey(
              full_name,
              email
            )
          `)
          .eq("order_id", orderId)
          .order("changed_at", { ascending: false });

        if (historyError && historyError.code !== "42P01") {
          console.warn("Status history fetch failed:", historyError);
          setStatusUpdates([]);
          return;
        }

        // Transform history data to match status updates format
        const transformedUpdates = (historyUpdates || []).map(update => ({
          id: update.id,
          order_id: update.order_id,
          status: update.new_status,  // Map to status column
          driver_id: update.changed_by,  // Map to driver_id column
          created_at: update.changed_at,  // Map to created_at column
          notes: update.notes,
          location: update.driver_location,
          metadata: update.metadata,
          driver: Array.isArray(update.changed_by_user) 
            ? update.changed_by_user[0] 
            : update.changed_by_user
        }));

        setStatusUpdates(transformedUpdates);
        return;
      }

      const fixedUpdates = (updates || []).map(update => ({
        ...update,
        driver: Array.isArray(update.driver) 
          ? update.driver[0] 
          : update.driver
      }));

      setStatusUpdates(fixedUpdates);
    } catch (error: any) {
      console.error("Error fetching status updates:", error);
      // Don't show error to user as this is supplementary information
      setStatusUpdates([]);
    }
  }, [orderId]);

  const subscribeToUpdates = useCallback(() => {
    if (!orderId) return;
    
    // Subscribe to order changes
    const orderChannel = supabase
      .channel(`order_${orderId}_changes`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          console.log("Order updated, refreshing...");
          fetchOrderDetails();
        }
      )
      .subscribe();

    // Subscribe to status updates
    const statusChannel = supabase
      .channel(`order_${orderId}_status_updates`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "status_updates",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log("✅ Status update INSERT received:", payload.new);
          fetchStatusUpdates();
          fetchOrderDetails(); // Also refresh order details
        }
      )
      .subscribe();

    // Also try order_status_history table
    const historyChannel = supabase
      .channel(`order_${orderId}_history_updates`)
      .on(
        "postgres_changes",
        {
          event: "INSERT", 
          schema: "public",
          table: "order_status_history",
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          console.log("Status history updated, refreshing...");
          fetchStatusUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(historyChannel);
    };
  }, [orderId, fetchOrderDetails, fetchStatusUpdates]);

  // Rest of your component code remains the same...
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: "bg-gray-500",
      assigned: "bg-blue-500",
      activated: "bg-green-500",
      in_progress: "bg-indigo-500",
      in_transit: "bg-purple-500",
      arrived: "bg-green-500",
      arrived_at_loading_point: "bg-green-500",
      loading: "bg-yellow-500",
      loaded: "bg-green-500",
      arrived_at_unloading_point: "bg-green-500",
      unloading: "bg-yellow-500",
      delivered: "bg-emerald-600",
      completed: "bg-emerald-600",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const formatStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      pending: "Pending Assignment",
      assigned: "Assigned to Driver",
      activated: "Load Activated",
      in_progress: "Trip Started",
      in_transit: "In Transit",
      arrived: "Arrived at Location",
      arrived_at_loading_point: "Arrived at Loading Point",
      loading: "Loading Cargo",
      loaded: "Cargo Loaded",
      arrived_at_unloading_point: "Arrived at Unloading Point",
      unloading: "Unloading Cargo",
      delivered: "Delivered",
      completed: "Order Completed",
      cancelled: "Cancelled",
    };
    return statusLabels[status] || status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const parseCoordinates = (order: Order) => {
    let loadingCoords = { lat: 0, lng: 0 };
    let unloadingCoords = { lat: 0, lng: 0 };

    try {
      // Priority 1: Use new coordinate columns
      if (order.loading_point_latitude && order.loading_point_longitude) {
        loadingCoords = {
          lat: Number(order.loading_point_latitude),
          lng: Number(order.loading_point_longitude)
        };
      } 
      // Fallback: Parse PostGIS format
      else if (order.loading_point_location && typeof order.loading_point_location === 'string') {
        const match = order.loading_point_location.match(/POINT\(([^)]+)\)/);
        if (match) {
          const [lng, lat] = match[1].split(" ").map(Number);
          loadingCoords = { lat, lng };
        }
      }

      // Priority 1: Use new coordinate columns
      if (order.unloading_point_latitude && order.unloading_point_longitude) {
        unloadingCoords = {
          lat: Number(order.unloading_point_latitude),
          lng: Number(order.unloading_point_longitude)
        };
      }
      // Fallback: Parse PostGIS format
      else if (order.unloading_point_location && typeof order.unloading_point_location === 'string') {
        const match = order.unloading_point_location.match(/POINT\(([^)]+)\)/);
        if (match) {
          const [lng, lat] = match[1].split(" ").map(Number);
          unloadingCoords = { lat, lng };
        }
      }
    } catch (error) {
      console.error("Error parsing coordinates:", error);
    }

    return { loadingCoords, unloadingCoords };
  };

  if (loading || !orderId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-600">Order not found</p>
          <button
            onClick={() => router.push("/orders")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const { loadingCoords, unloadingCoords } = parseCoordinates(order);

  return (
    // Your existing JSX remains exactly the same...
    <div className="min-h-screen bg-gray-50">
      {/* All your existing JSX content */}
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push("/orders")}
                className="mr-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Order {order.order_number}
                </h1>
                <p className="text-sm text-gray-500">
                  Created {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getStatusColor(order.status)}`}
              >
                {order.status.toUpperCase()}
              </span>
              <button
                onClick={() => router.push(`/orders`)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Edit Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Order Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Order Number</label>
                  <p className="mt-1 text-sm text-gray-900">{order.order_number}</p>
                </div>
                {order.sku && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">SKU</label>
                    <p className="mt-1 text-sm text-gray-900">{order.sku}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(order.status)}`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Assigned Driver</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {order.assigned_driver?.full_name || "Unassigned"}
                  </p>
                  {order.assigned_driver?.email && (
                    <p className="text-xs text-gray-500">{order.assigned_driver.email}</p>
                  )}
                </div>
                {order.expected_loading_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Expected Loading Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(order.expected_loading_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {order.expected_unloading_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Expected Delivery Date</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(order.expected_unloading_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Route Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Route Details</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Loading Point
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">{order.loading_point_name}</p>
                  <p className="text-sm text-gray-500">{order.loading_point_address}</p>
                  {loadingCoords.lat !== 0 && (
                    <p className="text-xs text-gray-400">
                      {loadingCoords.lat.toFixed(4)}, {loadingCoords.lng.toFixed(4)}
                    </p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    Unloading Point
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">{order.unloading_point_name}</p>
                  <p className="text-sm text-gray-500">{order.unloading_point_address}</p>
                  {unloadingCoords.lat !== 0 && (
                    <p className="text-xs text-gray-400">
                      {unloadingCoords.lat.toFixed(4)}, {unloadingCoords.lng.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {(order.delivery_instructions || order.special_handling_instructions || order.contact_name) && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h2>
                <div className="space-y-4">
                  {order.contact_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Customer Contact</label>
                      <p className="mt-1 text-sm text-gray-900">{order.contact_name}</p>
                      {order.contact_phone && (
                        <p className="text-sm text-gray-500">{order.contact_phone}</p>
                      )}
                    </div>
                  )}
                  {order.delivery_instructions && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Delivery Instructions</label>
                      <p className="mt-1 text-sm text-gray-900">{order.delivery_instructions}</p>
                    </div>
                  )}
                  {order.special_handling_instructions && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Special Handling</label>
                      <p className="mt-1 text-sm text-gray-900">{order.special_handling_instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Status Updates Sidebar */}
          <div className="lg:col-span-1">
            {/* Status Management Component */}
            <div className="mb-6">
              <StatusManagement 
                order={order}
                onStatusUpdate={async (updatedOrder) => {
                  await fetchOrderDetails();
                  await fetchStatusUpdates();
                  toast.success("Status updated successfully!");
                }}
              />
            </div>

            {/* Status History */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Status History</h2>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Status Updates</h2>
              
              {statusUpdates.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No status updates yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Updates will appear here when the driver updates the order status in the mobile app
                  </p>
                </div>
              ) : (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {statusUpdates.map((update, updateIdx) => {
                      const { date, time } = formatDateTime(update.created_at);
                      return (
                        <li key={update.id}>
                          <div className="relative pb-8">
                            {updateIdx !== statusUpdates.length - 1 ? (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex space-x-3">
                              <div>
                                <span
                                  className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(update.status)}`}
                                >
                                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div>
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">
                                      {formatStatusLabel(update.status)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-xs text-gray-500">
                                    {date} at {time}
                                  </p>
                                  {update.driver?.full_name && (
                                    <p className="text-xs text-gray-400">
                                      by {update.driver.full_name}
                                    </p>
                                  )}
                                </div>
                                {update.notes && (
                                  <div className="mt-2 text-sm text-gray-700 bg-gray-50 rounded p-2">
                                    {update.notes}
                                  </div>
                                )}
                                {update.location && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    📍 Location: {update.location.latitude?.toFixed(4)}, {update.location.longitude?.toFixed(4)}
                                  </div>
                                )}
                                {update.metadata && (
                                  <div className="mt-2">
                                    <details className="text-xs">
                                      <summary className="text-gray-500 cursor-pointer">Additional info</summary>
                                      <pre className="mt-1 text-gray-400 bg-gray-50 p-2 rounded text-xs overflow-auto">
                                        {JSON.stringify(update.metadata, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.open(`/tracking/${order.id}/public`, '_blank')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  View Public Tracking
                </button>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/tracking/${order.id}/public`;
                    navigator.clipboard.writeText(link);
                    toast.success("Tracking link copied to clipboard!");
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  Copy Tracking Link
                </button>
                <button
                  onClick={() => router.push(`/orders`)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                >
                  Edit Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
