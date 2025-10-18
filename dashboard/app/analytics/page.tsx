// Analytics Page - Reporting and Analytics
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Order, OrderStatus } from "../../shared/types";
// @ts-ignore
import
  {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
  } from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [timeRange, user]);

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
  };

  const fetchOrders = async () => {
    try {
      let dateFilter = new Date();
      if (timeRange === "7d") {
        dateFilter.setDate(dateFilter.getDate() - 7);
      } else if (timeRange === "30d") {
        dateFilter.setDate(dateFilter.getDate() - 30);
      } else {
        dateFilter.setDate(dateFilter.getDate() - 90);
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", dateFilter.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Prepare data for charts
  const getOrderStatusData = () => {
    const statusCounts: Record<OrderStatus, number> = {
      pending: 0,
      assigned: 0,
      activated: 0,
      in_progress: 0,
      in_transit: 0,
      arrived: 0,
      arrived_at_loading_point: 0,
      loading: 0,
      loaded: 0,
      arrived_at_unloading_point: 0,
      unloading: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      statusCounts[order.status]++;
    });

    return {
      labels: Object.keys(statusCounts),
      datasets: [
        {
          label: "Order Status Distribution",
          data: Object.values(statusCounts),
          backgroundColor: [
            "#6B7280", // pending
            "#3B82F6", // assigned
            "#8B5CF6", // in_transit
            "#10B981", // arrived
            "#F59E0B", // loading
            "#10B981", // loaded
            "#F59E0B", // unloading
            "#059669", // completed
            "#EF4444", // cancelled
          ],
        },
      ],
    };
  };

  const getOrdersOverTimeData = () => {
    // Group orders by date
    const ordersByDate: Record<string, number> = {};

    orders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split("T")[0];
      ordersByDate[date] = (ordersByDate[date] || 0) + 1;
    });

    const sortedDates = Object.keys(ordersByDate).sort();

    return {
      labels: sortedDates,
      datasets: [
        {
          label: "Orders Created",
          data: sortedDates.map((date) => ordersByDate[date]),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
        },
      ],
    };
  };

  const getStatusDistributionData = () => {
    const statusCounts: Record<OrderStatus, number> = {
      pending: 0,
      assigned: 0,
      activated: 0,
      in_progress: 0,
      in_transit: 0,
      arrived: 0,
      arrived_at_loading_point: 0,
      loading: 0,
      loaded: 0,
      arrived_at_unloading_point: 0,
      unloading: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0,
    };

    orders.forEach((order) => {
      statusCounts[order.status]++;
    });

    const completedOrders = statusCounts.completed;
    const inProgressOrders = Object.values(statusCounts).reduce(
      (sum, count, index) => {
        const status = Object.keys(statusCounts)[index] as OrderStatus;
        if (status !== "completed" && status !== "cancelled") {
          return sum + count;
        }
        return sum;
      },
      0
    );
    const cancelledOrders = statusCounts.cancelled;

    return {
      labels: ["Completed", "In Progress", "Cancelled"],
      datasets: [
        {
          label: "Order Distribution",
          data: [completedOrders, inProgressOrders, cancelledOrders],
          backgroundColor: ["#059669", "#3B82F6", "#EF4444"],
        },
      ],
    };
  };

  // Chart options
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Order Status Distribution",
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Orders Over Time",
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Order Distribution",
      },
    },
  };

  // Calculate KPIs
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const completionRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const inTransitOrders = orders.filter(
    (o) => o.status === "in_transit"
  ).length;
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading analytics...</div>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Analytics & Reporting
            </h1>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 hidden md:block"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Operational metrics and performance insights
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Time Range</h2>
            <div className="flex space-x-2 mt-2 md:mt-0">
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeRange === "7d"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange("30d")}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeRange === "30d"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange("90d")}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeRange === "90d"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                90 Days
              </button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total Orders</div>
            <div className="text-3xl font-bold mt-2">{totalOrders}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Completion Rate</div>
            <div className="text-3xl font-bold mt-2">{completionRate}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">In Transit</div>
            <div className="text-3xl font-bold mt-2">{inTransitOrders}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-3xl font-bold mt-2">{pendingOrders}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <Bar options={barChartOptions} data={getOrderStatusData()} />
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <Line options={lineChartOptions} data={getOrdersOverTimeData()} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <Pie options={pieChartOptions} data={getStatusDistributionData()} />
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Orders
            </h2>
            <div className="overflow-x-auto">
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
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
