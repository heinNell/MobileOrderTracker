// Dashboard Page - High-Level Analytics & Reporting
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Order, OrderStatus } from "../shared/types";

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeDrivers: number;
  completionRate: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  avgDeliveryTime: number;
  statusBreakdown: Record<OrderStatus, number>;
  topCustomers: Array<{ customer_name: string; order_count: number; total_amount: number }>;
  recentOrders: Order[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeDrivers: 0,
    completionRate: 0,
    ordersToday: 0,
    ordersThisWeek: 0,
    ordersThisMonth: 0,
    avgDeliveryTime: 0,
    statusBreakdown: {} as Record<OrderStatus, number>,
    topCustomers: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

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
      cleanup = subscribeToOrders();
    };

    checkAuth();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto-refresh only if enabled by user - every 5 minutes instead of 30 seconds
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      console.log("Dashboard - Auto-refresh triggered (5min interval)");
      fetchOrders();
      setLastRefresh(new Date());
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    console.log("Dashboard - Manual refresh triggered");
    setLoading(true);
    fetchOrders();
    setLastRefresh(new Date());
  };

  const fetchOrders = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.error("No active session");
        return;
      }

      // Get user's tenant info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user data:", userError);
      }

      console.log("Dashboard - User data:", userData);

      // Build query with tenant filtering
      let ordersQuery = supabase
        .from("orders")
        .select(
          `
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email
          )
        `
        );

      // Apply tenant filter if user has a tenant_id
      if (userData?.tenant_id) {
        ordersQuery = ordersQuery.eq("tenant_id", userData.tenant_id);
        console.log("Dashboard - Filtering by tenant_id:", userData.tenant_id);
      }

      const { data: allOrders, error } = await ordersQuery.order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Dashboard - Orders fetched:", allOrders?.length || 0);

      // Calculate statistics
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalOrders = allOrders?.length || 0;
      const completedOrders = allOrders?.filter(o => o.status === 'completed') || [];
      const ordersToday = allOrders?.filter(o => new Date(o.created_at) >= todayStart).length || 0;
      const ordersThisWeek = allOrders?.filter(o => new Date(o.created_at) >= weekStart).length || 0;
      const ordersThisMonth = allOrders?.filter(o => new Date(o.created_at) >= monthStart).length || 0;

      // Calculate total revenue
      const totalRevenue = allOrders?.reduce((sum, order) => {
        const amount = typeof order.total_amount === 'number' 
          ? order.total_amount 
          : parseFloat(String(order.total_amount || '0'));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0) || 0;

      // Get active drivers count
      const { data: drivers } = await supabase
        .from("users")
        .select("id")
        .eq("role", "driver")
        .eq("is_active", true);

      const activeDrivers = drivers?.length || 0;

      // Calculate completion rate
      const completionRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0;

      // Calculate average delivery time
      const deliveryTimes = completedOrders
        .filter(o => o.actual_start_time && o.actual_end_time)
        .map(o => {
          const start = new Date(o.actual_start_time!).getTime();
          const end = new Date(o.actual_end_time!).getTime();
          return (end - start) / (1000 * 60 * 60); // hours
        });

      const avgDeliveryTime = deliveryTimes.length > 0
        ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
        : 0;

      // Status breakdown
      const statusBreakdown = allOrders?.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<OrderStatus, number>) || {};

      // Top customers by order count and revenue
      const customerStats = allOrders?.reduce((acc, order) => {
        const name = order.customer_name || 'Unknown';
        if (!acc[name]) {
          acc[name] = { customer_name: name, order_count: 0, total_amount: 0 };
        }
        acc[name].order_count++;
        const amount = typeof order.total_amount === 'number' 
          ? order.total_amount 
          : parseFloat(String(order.total_amount || '0'));
        acc[name].total_amount += isNaN(amount) ? 0 : amount;
        return acc;
      }, {} as Record<string, { customer_name: string; order_count: number; total_amount: number }>) || {};

      const topCustomers: Array<{ customer_name: string; order_count: number; total_amount: number }> = 
        (Object.values(customerStats) as Array<{ customer_name: string; order_count: number; total_amount: number }>)
          .sort((a, b) => b.total_amount - a.total_amount)
          .slice(0, 5);

      // Recent orders
      const recentOrders = allOrders?.slice(0, 10) || [];

      setStats({
        totalOrders,
        totalRevenue,
        activeDrivers,
        completionRate,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        avgDeliveryTime,
        statusBreakdown,
        topCustomers,
        recentOrders,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
    // Subscribe to orders changes - but with debouncing to prevent excessive refreshes
    let refreshTimeout: ReturnType<typeof setTimeout>;
    
    const debouncedRefresh = () => {
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        console.log("Dashboard - Debounced refresh from subscription");
        fetchOrders();
      }, 2000); // Wait 2 seconds before refreshing to batch updates
    };

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
          console.log("Dashboard - Order change detected");
          debouncedRefresh();
        }
      )
      .subscribe();

    // Reduced subscriptions - only essential ones to minimize disruption
    // Removed driver locations subscription as it's too frequent for dashboard needs
    const driversChannel = supabase
      .channel("drivers_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: "role=eq.driver",
        },
        () => {
          console.log("Dashboard - Driver data change detected");
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(refreshTimeout);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(driversChannel);
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
      arrived_at_loading_point: "bg-teal-500",
      loading: "bg-yellow-500",
      loaded: "bg-green-500",
      arrived_at_unloading_point: "bg-teal-500",
      unloading: "bg-yellow-500",
      delivered: "bg-emerald-500",
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
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <div className="flex items-center space-x-3">
            {user && (
              <span className="text-sm text-gray-600 truncate max-w-[120px]">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 hidden md:block">
                📊 Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                High-level reporting and insights
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-600">Auto-refresh</span>
                </label>
              </div>
              <div className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center shadow-sm"
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

        {/* Overview Stats - Primary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 uppercase">Total Orders</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <span className="font-semibold text-green-600">↗ {stats.ordersToday}</span> today
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 uppercase">Total Revenue</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  ${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Average: ${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : '0.00'} per order
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 uppercase">Active Drivers</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{stats.activeDrivers}</div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Currently available
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-500 uppercase">Completion Rate</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{stats.completionRate.toFixed(1)}%</div>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              Avg delivery: {stats.avgDeliveryTime.toFixed(1)}h
            </div>
          </div>
        </div>

        {/* Time Period Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Today</h3>
              <span className="text-2xl">📅</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.ordersToday}</div>
            <div className="text-sm text-gray-500 mt-1">orders</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">This Week</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.ordersThisWeek}</div>
            <div className="text-sm text-gray-500 mt-1">orders</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">This Month</h3>
              <span className="text-2xl">📈</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats.ordersThisMonth}</div>
            <div className="text-sm text-gray-500 mt-1">orders</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Breakdown */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Order Status Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-3 h-3 rounded-full ${getStatusColor(status as OrderStatus)}`}></span>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getStatusColor(status as OrderStatus)}`}
                        style={{ width: `${(count / stats.totalOrders) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Customers</h3>
            <div className="space-y-3">
              {stats.topCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No customer data available</p>
              ) : (
                stats.topCustomers.map((customer, index) => (
                  <div key={customer.customer_name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{customer.customer_name}</div>
                        <div className="text-xs text-gray-500">{customer.order_count} orders</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${customer.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500">total revenue</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white shadow-md rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">🚚 Recent Orders</h2>
            <button
              onClick={() => router.push("/orders")}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
            >
              View all
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.order_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.customer_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.assigned_driver?.full_name || "Unassigned"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${typeof order.total_amount === 'number' 
                          ? order.total_amount.toFixed(2) 
                          : parseFloat(String(order.total_amount || '0')).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
