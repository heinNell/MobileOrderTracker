// Dashboard Page - Main Dashboard Interface
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Order, OrderStatus } from "../shared/types";

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Auto-refresh every 30 seconds to ensure data stays current
    const interval = setInterval(() => {
      console.log("Dashboard - Auto-refresh triggered");
      fetchOrders();
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    console.log("Dashboard - Manual refresh triggered");
    setLoading(true);
    fetchOrders();
    setLastRefresh(new Date());
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
    fetchOrders();
    subscribeToOrders();
  };

  const fetchOrders = async () => {
    try {
      // Get current session and user info
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No active session");
        return;
      }

      // Get user's tenant info for consistent filtering
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      console.log("Dashboard - User data:", userData);

      // Build query with tenant filtering if user has tenant_id
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email,
            last_location,
            last_location_update,
            is_active
          )
        `
        );

      // Apply tenant filter if user has a tenant_id
      if (userData?.tenant_id) {
        query = query.eq("tenant_id", userData.tenant_id);
        console.log("Dashboard - Filtering by tenant_id:", userData.tenant_id);
      } else {
        console.log("Dashboard - User has no tenant_id, showing all orders");
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(10); // Limit to 10 most recent orders for dashboard

      if (error) throw error;

      console.log("Dashboard - Orders fetched:", data?.length || 0);
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    // Subscribe to orders changes
    const ordersChannel = supabase
      .channel("orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          console.log("Dashboard - Order change detected, refreshing...");
          fetchOrders();
        }
      )
      .subscribe();

    // Also subscribe to driver location updates to refresh driver data
    const driversChannel = supabase
      .channel("drivers_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: "role=eq.driver",
        },
        () => {
          console.log("Dashboard - Driver data change detected, refreshing...");
          fetchOrders();
        }
      )
      .subscribe();

    // Subscribe to driver location updates
    const locationsChannel = supabase
      .channel("driver_locations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
        },
        () => {
          console.log("Dashboard - Driver location change detected, refreshing...");
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(driversChannel);
      supabase.removeChannel(locationsChannel);
    };
  };

  const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<OrderStatus, string> = {
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
    return colors[status];
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-3">
            {user && (
              <span className="text-sm text-gray-600 truncate max-w-[120px]">
                {user.email}
              </span>
            )}
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 hidden md:block">
                Logistics Dashboard
              </h1>
              <div className="flex flex-col md:flex-row md:items-center mt-2">
                <p className="text-gray-600">
                  Welcome back! Here's what's happening today.
                </p>
                {user && (
                  <span className="text-sm text-gray-600 mt-2 md:mt-0 md:ml-4">
                    Logged in as: {user.email}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <div className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="text-sm text-gray-500">Total Orders</div>
            <div className="text-2xl md:text-3xl font-bold mt-1">{orders.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="text-sm text-gray-500">In Transit</div>
            <div className="text-2xl md:text-3xl font-bold mt-1">
              {orders.filter((o) => o.status === "in_transit").length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl md:text-3xl font-bold mt-1">
              {orders.filter((o) => o.status === "completed").length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl md:text-3xl font-bold mt-1">
              {orders.filter((o) => o.status === "pending").length}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Driver Status
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loading Point
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unloading Point
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 md:px-6 py-4 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </div>
                        <div className="text-xs text-gray-500 md:hidden">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 hidden md:block">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="max-w-[100px] md:max-w-[150px]">
                          <div className="truncate font-medium">
                            {order.assigned_driver?.full_name || "Unassigned"}
                          </div>
                          {order.assigned_driver && (
                            <div className="text-xs text-gray-500 truncate">
                              {order.assigned_driver.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {order.assigned_driver ? (
                          <div>
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.assigned_driver.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.assigned_driver.is_active ? 'Active' : 'Inactive'}
                            </div>
                            {order.assigned_driver.last_location_update && (
                              <div className="text-xs text-gray-400 mt-1">
                                Updated: {new Date(order.assigned_driver.last_location_update).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-[100px] md:max-w-[150px] truncate">
                          {order.loading_point_name}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-[100px] md:max-w-[150px] truncate">
                          {order.unloading_point_name}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 md:px-6 py-4 bg-gray-50 text-right">
            <button
              onClick={() => router.push("/orders")}
              className="text-blue-600 hover:text-blue-900 font-medium"
            >
              View all orders →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
