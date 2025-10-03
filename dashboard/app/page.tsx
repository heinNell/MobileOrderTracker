// Dashboard Page - Order Management Interface
"use client";

import React, { useState, useEffect } from "react";
import { supabase, generateQRCode } from "../lib/supabase";
import type { Order, OrderStatus } from "../../shared/types";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    fetchOrders();
    subscribeToOrders();
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    const channel = supabase
      .channel("orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleGenerateQR = async (orderId: string) => {
    try {
      const qrCode = await generateQRCode(orderId);

      // Create download link for QR code
      const link = document.createElement("a");
      link.href = qrCode.image;
      link.download = `order-${orderId}-qr.png`;
      link.click();

      alert("QR code generated and downloaded successfully!");
    } catch (error: any) {
      console.error("Error generating QR code:", error);
      alert(error.message || "Failed to generate QR code");
    }
  };

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userError) {
        console.error("User fetch error:", userError);
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }

      if (!userData) {
        throw new Error(
          "User not found in database. Please ensure your profile is set up."
        );
      }

      // Create order with QR code placeholder
      const orderNumber = `ORD-${Date.now()}`;
      const qrCodeData = `${orderNumber}-${Date.now()}`;

      // Get coordinates from form
      const loadingLat = formData.get("loading_lat") as string;
      const loadingLng = formData.get("loading_lng") as string;
      const unloadingLat = formData.get("unloading_lat") as string;
      const unloadingLng = formData.get("unloading_lng") as string;

      // Build the insert object with only columns that exist
      const orderData: any = {
        tenant_id: userData.tenant_id,
        order_number: orderNumber,
        qr_code_data: qrCodeData,
        qr_code_signature: "pending",
        status: "pending",
        loading_point_name: formData.get("loading_point_name") as string,
        loading_point_address: formData.get("loading_point_address") as string,
        loading_point_location: `SRID=4326;POINT(${loadingLng} ${loadingLat})`,
        unloading_point_name: formData.get("unloading_point_name") as string,
        unloading_point_address: formData.get(
          "unloading_point_address"
        ) as string,
        unloading_point_location: `SRID=4326;POINT(${unloadingLng} ${unloadingLat})`,
      };

      // Add optional fields only if they exist in the schema
      const sku = formData.get("sku") as string;
      if (sku) {
        orderData.sku = sku;
      }

      const estimatedDistance = formData.get("estimated_distance") as string;
      if (estimatedDistance) {
        orderData.estimated_distance_km = parseFloat(estimatedDistance) || null;
      }

      const estimatedDuration = formData.get("estimated_duration") as string;
      if (estimatedDuration) {
        orderData.estimated_duration_minutes =
          parseInt(estimatedDuration) || null;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .maybeSingle();

      if (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      if (!order) {
        throw new Error("Order was not created");
      }

      // Try to generate QR code (optional - don't fail if this errors)
      try {
        await generateQRCode(order.id);
        alert(
          "Order created successfully! QR code has been generated and downloaded."
        );
      } catch (qrError: any) {
        console.warn("QR generation failed:", qrError);
        alert(
          "Order created successfully! (QR code generation failed - you can generate it later by clicking 'Generate QR' button)"
        );
      }

      setShowCreateModal(false);
      fetchOrders();
    } catch (error: any) {
      console.error("Error creating order:", error);
      alert(error.message || "Failed to create order");
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<OrderStatus, string> = {
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
    return colors[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Logistics Dashboard
            </h1>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-gray-600">{user.email}</span>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create New Order
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push("/login");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Orders</div>
            <div className="text-3xl font-bold mt-2">{orders.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">In Transit</div>
            <div className="text-3xl font-bold mt-2">
              {orders.filter((o) => o.status === "in_transit").length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-3xl font-bold mt-2">
              {orders.filter((o) => o.status === "completed").length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-3xl font-bold mt-2">
              {orders.filter((o) => o.status === "pending").length}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loading Point
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unloading Point
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.order_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.assigned_driver?.full_name || "Unassigned"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.loading_point_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.unloading_point_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleGenerateQR(order.id)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Generate QR
                    </button>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-green-600 hover:text-green-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  Create New Order
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

            <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Basic Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU / Reference Number
                  </label>
                  <input
                    type="text"
                    name="sku"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., SKU-12345"
                  />
                </div>
              </div>

              {/* Loading Point */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Loading Point
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    name="loading_point_name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Warehouse A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Address
                  </label>
                  <input
                    type="text"
                    name="loading_point_address"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 123 Main St, City, Country"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      name="loading_lat"
                      step="any"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., -26.2041"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      name="loading_lng"
                      step="any"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 28.0473"
                    />
                  </div>
                </div>
              </div>

              {/* Unloading Point */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Unloading Point (Destination)
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name
                  </label>
                  <input
                    type="text"
                    name="unloading_point_name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Customer Location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Address
                  </label>
                  <input
                    type="text"
                    name="unloading_point_address"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 456 Oak Ave, City, Country"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      name="unloading_lat"
                      step="any"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., -25.7479"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      name="unloading_lng"
                      step="any"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 28.2293"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Estimated Delivery Details (Optional)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Distance (km)
                    </label>
                    <input
                      type="number"
                      name="estimated_distance"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      name="estimated_duration"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 60"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
