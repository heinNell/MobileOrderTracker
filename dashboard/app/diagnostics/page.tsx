"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface DiagnosticData {
  user: any;
  userData: any;
  userOrders: any[];
  allOrders: any[];
  drivers: any[];
  recentDriver: any;
}

export default function DiagnosticPage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      // Get user data
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Get all orders (no filter)
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      // Get orders with user's tenant_id filter
      const { data: userOrders, error: userOrdersError } = await supabase
        .from("orders")
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("tenant_id", userData?.tenant_id || "")
        .order("created_at", { ascending: false });

      // Get drivers
      const { data: drivers, error: driversError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "driver")
        .order("created_at", { ascending: false });

      // Get most recent driver
      const { data: recentDriver, error: recentDriverError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "driver")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setData({
        user: session.user,
        userData: userData || null,
        userOrders: userOrders || [],
        allOrders: allOrders || [],
        drivers: drivers || [],
        recentDriver: recentDriver || null,
      });

    } catch (error) {
      console.error("Diagnostic error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fixTenantIssues = async () => {
    if (!data) return;
    
    try {
      setLoading(true);
      
      // Fix user tenant_id if null
      if (!data.userData?.tenant_id) {
        const { error: userError } = await supabase
          .from("users")
          .update({ tenant_id: "default-tenant" })
          .eq("id", data.user.id);
          
        if (userError) {
          console.error("Error fixing user tenant:", userError);
        } else {
          console.log("Fixed user tenant_id");
        }
      }
      
      // Fix driver tenant_ids if they don't match
      for (const driver of data.drivers) {
        if (driver.tenant_id !== data.userData?.tenant_id) {
          const { error: driverError } = await supabase
            .from("users")
            .update({ tenant_id: data.userData?.tenant_id || "default-tenant" })
            .eq("id", driver.id);
            
          if (driverError) {
            console.error(`Error fixing driver ${driver.id} tenant:`, driverError);
          } else {
            console.log(`Fixed driver ${driver.full_name} tenant_id`);
          }
        }
      }
      
      // Fix order tenant_ids if they don't match
      for (const order of data.allOrders) {
        if (order.tenant_id !== data.userData?.tenant_id) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({ tenant_id: data.userData?.tenant_id || "default-tenant" })
            .eq("id", order.id);
            
          if (orderError) {
            console.error(`Error fixing order ${order.order_number} tenant:`, orderError);
          } else {
            console.log(`Fixed order ${order.order_number} tenant_id`);
          }
        }
      }
      
      alert("Tenant ID issues fixed! Please refresh the page.");
      
    } catch (error) {
      console.error("Error fixing tenant issues:", error);
      const message = error instanceof Error ? error.message : String(error);
      alert("Error fixing tenant issues: " + message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Running Diagnostics...</h1>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-red-600">Diagnostic Failed</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">System Diagnostics</h1>

        {/* Current User */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current User (Auth)</h2>
          <div className="space-y-2">
            <div><strong>ID:</strong> {data.user.id}</div>
            <div><strong>Email:</strong> {data.user.email}</div>
            <div><strong>Created:</strong> {new Date(data.user.created_at).toLocaleString()}</div>
          </div>
        </div>

        {/* User Data from Database */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">User Profile (Database)</h2>
          {data.userData ? (
            <div className="space-y-2">
              <div><strong>Full Name:</strong> {data.userData.full_name || "Not set"}</div>
              <div><strong>Role:</strong> {data.userData.role || "Not set"}</div>
              <div><strong>Tenant ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{data.userData.tenant_id || "NULL"}</code></div>
              <div><strong>Active:</strong> {data.userData.is_active ? "Yes" : "No"}</div>
              <div><strong>Phone:</strong> {data.userData.phone || "Not set"}</div>
            </div>
          ) : (
            <div className="text-red-600">⚠️ User not found in users table</div>
          )}
        </div>

        {/* Orders Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">All Orders (No Filter)</h2>
            <div className="text-3xl font-bold text-blue-600">{data.allOrders.length}</div>
            <div className="text-sm text-gray-600 mt-2">
              {data.allOrders.length > 0 && (
                <div>
                  Latest: {new Date(data.allOrders[0].created_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Tenant-Filtered Orders</h2>
            <div className="text-3xl font-bold text-green-600">{data.userOrders.length}</div>
            <div className="text-sm text-gray-600 mt-2">
              Using tenant_id: <code className="bg-gray-100 px-1 rounded">{data.userData?.tenant_id || "NULL"}</code>
            </div>
          </div>
        </div>

        {/* Recent Driver */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Most Recent Driver Created</h2>
          {data.recentDriver ? (
            <div className="space-y-2">
              <div><strong>Name:</strong> {data.recentDriver.full_name}</div>
              <div><strong>Email:</strong> {data.recentDriver.email}</div>
              <div><strong>Tenant ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{data.recentDriver.tenant_id || "NULL"}</code></div>
              <div><strong>Created:</strong> {new Date(data.recentDriver.created_at).toLocaleString()}</div>
              <div><strong>Active:</strong> {data.recentDriver.is_active ? "Yes" : "No"}</div>
            </div>
          ) : (
            <div className="text-gray-500">No drivers found</div>
          )}
        </div>

        {/* Recent Orders Details */}
        {data.allOrders.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Recent Orders (Last 10)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Order #</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Driver ID</th>
                    <th className="text-left py-2">Driver Name</th>
                    <th className="text-left py-2">Order Tenant</th>
                    <th className="text-left py-2">Driver Tenant</th>
                    <th className="text-left py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allOrders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2">{order.order_number}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <code className="bg-gray-100 px-1 rounded text-xs">
                          {order.assigned_driver_id ? order.assigned_driver_id.substring(0, 8) + "..." : "None"}
                        </code>
                      </td>
                      <td className="py-2">{order.assigned_driver?.full_name || "Unassigned"}</td>
                      <td className="py-2">
                        <code className="bg-gray-100 px-1 rounded text-xs">
                          {order.tenant_id || "NULL"}
                        </code>
                      </td>
                      <td className="py-2">
                        <code className="bg-gray-100 px-1 rounded text-xs">
                          {data.drivers.find(d => d.id === order.assigned_driver_id)?.tenant_id || "N/A"}
                        </code>
                      </td>
                      <td className="py-2 text-sm">{new Date(order.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Actions & Quick Fixes</h2>
          <div className="space-y-3">
            {!data.userData?.tenant_id && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <strong className="text-red-800">Issue:</strong> Your user account doesn't have a tenant_id set.
                This might cause orders to not appear in the dashboard.
              </div>
            )}
            
            {data.allOrders.length > data.userOrders.length && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <strong className="text-yellow-800">Notice:</strong> There are {data.allOrders.length - data.userOrders.length} orders 
                that don't match your tenant_id filter. These won't appear in the filtered dashboard view.
              </div>
            )}

            {data.recentDriver && data.recentDriver.tenant_id !== data.userData?.tenant_id && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                <strong className="text-orange-800">Tenant Mismatch:</strong> Your recently created driver has a different tenant_id 
                ({data.recentDriver.tenant_id || "NULL"}) than your user account ({data.userData?.tenant_id || "NULL"}).
              </div>
            )}
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Running..." : "Refresh Diagnostics"}
              </button>
              
              <button
                onClick={fixTenantIssues}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Fixing..." : "🔧 Fix Tenant Issues"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}