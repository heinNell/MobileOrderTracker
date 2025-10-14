"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { Order, User } from "../../../shared/types";

interface DriverDetailProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DriverDetailPage({ params }: DriverDetailProps) {
  const [driver, setDriver] = useState<User | null>(null);
  const [driverOrders, setDriverOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "performance">("profile");
  const [driverId, setDriverId] = useState<string>("");
  const [temporaryPassword, setTemporaryPassword] = useState<string>("");
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      setDriverId(resolvedParams.id);
    };
    
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (driverId) {
      checkAuth();
    }
  }, [driverId]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);
    fetchDriverDetails();
  };

  const fetchDriverDetails = async () => {
    if (!driverId) return;
    
    try {
      setLoading(true);

      // Fetch driver information
      const { data: driverData, error: driverError } = await supabase
        .from("users")
        .select("*")
        .eq("id", driverId)
        .eq("role", "driver")
        .single();

      if (driverError) {
        console.error("Error fetching driver:", driverError);
        if (driverError.code === 'PGRST116') {
          // Driver not found
          router.push("/drivers");
          return;
        }
        throw driverError;
      }

      setDriver(driverData);

      // Fetch driver's orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name
          )
        `)
        .eq("assigned_driver_id", driverId)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error fetching driver orders:", ordersError);
      } else {
        setDriverOrders(ordersData || []);
      }
    } catch (error) {
      console.error("Error fetching driver details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDriverStatus = async () => {
    if (!driver) return;

    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: !driver.is_active })
        .eq("id", driver.id);

      if (error) throw error;

      // Update local state
      setDriver({ ...driver, is_active: !driver.is_active });
    } catch (error) {
      console.error("Error updating driver status:", error);
      alert("Failed to update driver status");
    }
  };

  const handleGenerateTemporaryPassword = async () => {
    if (!driver) return;

    try {
      setGeneratingPassword(true);

      // Get current session for authorization
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Authentication required");
      }

      // Call the reset password edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reset-driver-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            driver_id: driver.id,
            email: driver.email,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Error: ${response.status}`);
      }

      if (!responseData.success) {
        throw new Error(responseData.error || "Unknown error occurred");
      }

      // Show the temporary password
      setTemporaryPassword(responseData.data.temporary_password);
      setShowTempPassword(true);

      // Auto-hide after 30 seconds for security
      setTimeout(() => {
        setShowTempPassword(false);
        setTemporaryPassword("");
      }, 30000);

    } catch (error) {
      console.error("Error generating temporary password:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to generate temporary password: ${errorMessage}`);
    } finally {
      setGeneratingPassword(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "in_transit":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculatePerformanceMetrics = () => {
    const totalOrders = driverOrders.length;
    const completedOrders = driverOrders.filter(order => order.status === "completed").length;
    const inTransitOrders = driverOrders.filter(order => order.status === "in_transit").length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : "0";

    return {
      totalOrders,
      completedOrders,
      inTransitOrders,
      completionRate,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading driver details...</div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Driver not found</div>
      </div>
    );
  }

  const metrics = calculatePerformanceMetrics();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/drivers")}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{driver.full_name}</h1>
                <p className="text-gray-600">{driver.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  driver.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {driver.is_active ? "Active" : "Inactive"}
              </span>
              <button
                onClick={handleToggleDriverStatus}
                className={`px-4 py-2 rounded-md font-medium ${
                  driver.is_active
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {driver.is_active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "orders"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Orders ({driverOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("performance")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "performance"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Performance
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Driver Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Driver Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{driver.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{driver.email}</p>
                </div>
                {driver.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{driver.phone}</p>
                  </div>
                )}
                {driver.license_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <p className="mt-1 text-sm text-gray-900">{driver.license_number}</p>
                  </div>
                )}
                {driver.license_expiry && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Expiry</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(driver.license_expiry).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(driver.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                {/* Temporary Password Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Temporary Password</label>
                    <button
                      onClick={handleGenerateTemporaryPassword}
                      disabled={generatingPassword}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {generatingPassword ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        "Generate New"
                      )}
                    </button>
                  </div>
                  
                  {showTempPassword && temporaryPassword ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                        </svg>
                        <span className="text-sm font-medium text-yellow-800">New Temporary Password Generated</span>
                      </div>
                      <div className="bg-white rounded border px-3 py-2 mb-2">
                        <code className="text-sm font-mono text-gray-900 select-all">{temporaryPassword}</code>
                      </div>
                      <p className="text-xs text-yellow-700">
                        Please share this password with the driver securely. This will auto-hide in 30 seconds for security.
                        The driver should change this password on first login.
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(temporaryPassword);
                          alert("Password copied to clipboard!");
                        }}
                        className="mt-2 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Click "Generate New" to create a temporary password for this driver.
                      This will reset their current password.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Location Information</h2>
              <div className="space-y-4">
                {driver.last_location_update ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Location Update</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(driver.last_location_update)}
                      </p>
                    </div>
                    {driver.last_location && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Coordinates</label>
                        <p className="mt-1 text-sm text-gray-900 font-mono">
                          {driver.last_location.latitude.toFixed(6)}, {driver.last_location.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No location data available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Driver Orders</h2>
            </div>
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
                      Loading Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unloading Point
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {driverOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No orders assigned to this driver
                      </td>
                    </tr>
                  ) : (
                    driverOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.order_number}
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
                          {order.loading_point_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.unloading_point_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "performance" && (
          <div className="space-y-8">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-sm text-gray-500">Total Orders</div>
                <div className="text-3xl font-bold mt-1">{metrics.totalOrders}</div>
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-sm text-gray-500">Completed</div>
                <div className="text-3xl font-bold mt-1 text-green-600">{metrics.completedOrders}</div>
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-sm text-gray-500">In Transit</div>
                <div className="text-3xl font-bold mt-1 text-blue-600">{metrics.inTransitOrders}</div>
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <div className="text-sm text-gray-500">Completion Rate</div>
                <div className="text-3xl font-bold mt-1">{metrics.completionRate}%</div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {driverOrders.length === 0 ? (
                  <p className="text-gray-500">No recent activity</p>
                ) : (
                  <div className="space-y-4">
                    {driverOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Order #{order.order_number}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.loading_point_name} → {order.unloading_point_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status.toUpperCase()}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}