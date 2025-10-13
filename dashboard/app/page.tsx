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
        .order("created_at", { ascending: false })
        .limit(10); // Limit to 10 most recent orders for dashboard

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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 hidden md:block">
            Logistics Dashboard
          </h1>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-2">
            <p className="text-gray-600">
              Welcome back! Here's what's happening today.
            </p>
            {user && (
              <span className="text-sm text-gray-600 mt-2 md:mt-0 hidden md:block">
                Logged in as: {user.email}
              </span>
            )}
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
                    <td colSpan={5} className="px-4 md:px-6 py-4 text-center text-gray-500">
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
                        <div className="max-w-[100px] md:max-w-[150px] truncate">
                          {order.assigned_driver?.full_name || "Unassigned"}
                        </div>
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
