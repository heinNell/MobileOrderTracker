// Enhanced Order Management with Better Error Handling and Debugging
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { exportOrderToPDF } from "../../lib/pdf-export";
import
  {
    downloadQRCode,
    generateQRCode,
    testQRCodeFlow,
  } from "../../lib/qr-service";
import { supabase } from "../../lib/supabase";
import
  {
    handleApiError,
    handleSuccess
  } from "../../lib/utils";
import type { Order, OrderStatus } from "../../shared/types";
import EnhancedOrderForm from "../components/EnhancedOrderForm";
import QRDebugger from "../components/QRDebugger";

interface DebugInfo {
  userStatus: string;
  tenantInfo: any;
  orderCount: number;
  rlsStatus: string;
  lastError: string | null;
}

export default function EnhancedOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showQRDebugger, setShowQRDebugger] = useState(false);
  const [debugOrderId, setDebugOrderId] = useState<string>("");
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingLink, setTrackingLink] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    userStatus: "Unknown",
    tenantInfo: null,
    orderCount: 0,
    rlsStatus: "Unknown",
    lastError: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortBy, setSortBy] = useState<
    "created_at" | "order_number" | "status"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ordersPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchTerm, statusFilter, sortBy, sortOrder, currentPage]);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setDebugInfo((prev) => ({
          ...prev,
          userStatus: "Not authenticated",
          lastError: "No active session found",
        }));
        router.push("/login");
        return;
      }

      setUser(session.user);
      setDebugInfo((prev) => ({
        ...prev,
        userStatus: "Authenticated",
      }));

      await performDiagnostics(session.user);
      await fetchOrders();
      subscribeToOrders();
    } catch (error: any) {
      setDebugInfo((prev) => ({
        ...prev,
        lastError: error.message,
      }));
      handleApiError(error, "Failed to authenticate");
    }
  };

  const performDiagnostics = async (user: any) => {
    try {
      // Check user-tenant linkage
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          full_name,
          role,
          tenant_id,
          is_active,
          tenants:tenant_id (
            id,
            name,
            is_active
          )
        `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (userError) {
        setDebugInfo((prev) => ({
          ...prev,
          userStatus: "User not found in users table",
          lastError: userError.message,
        }));
        return;
      }

      if (!userData) {
        setDebugInfo((prev) => ({
          ...prev,
          userStatus: "User exists in auth but not in users table",
          lastError: "User profile incomplete",
        }));
        return;
      }

      if (!userData.tenant_id) {
        setDebugInfo((prev) => ({
          ...prev,
          userStatus: "User not linked to any tenant",
          tenantInfo: null,
          lastError: "User has no tenant assignment",
        }));
        return;
      }

      // Count visible orders
      const { count: orderCount, error: countError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", userData.tenant_id);

      setDebugInfo((prev) => ({
        ...prev,
        userStatus: "User properly configured",
        tenantInfo: userData.tenants,
        orderCount: orderCount || 0,
        rlsStatus: countError
          ? "RLS may be blocking access"
          : "RLS working correctly",
        lastError: countError?.message || null,
      }));
    } catch (error: any) {
      setDebugInfo((prev) => ({
        ...prev,
        lastError: error.message,
      }));
    }
  };

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);

      // First, verify user access
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      // Get user's tenant info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (userError) {
        throw new Error(`User lookup failed: ${userError.message}`);
      }

      if (!userData) {
        throw new Error(
          "User not found in users table. Please ensure your profile is set up."
        );
      }

      if (!userData.tenant_id) {
        throw new Error(
          "User is not linked to any organization. Please contact your administrator."
        );
      }

      console.log("Orders Page - User tenant_id:", userData.tenant_id);
      console.log("Orders Page - User role:", userData.role);

      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", userData.tenant_id);

      if (countError) {
        throw new Error(`Failed to count orders: ${countError.message}`);
      }

      if (count) {
        setTotalPages(Math.ceil(count / ordersPerPage));
      }

      // Get orders for current page
      const from = (page - 1) * ordersPerPage;
      const to = from + ordersPerPage - 1;

      // FIXED: Use a more reliable query method instead of foreign key naming
      // First try the view approach, fallback to manual join
      let data, error;
      
      try {
        // Try using the orders_with_drivers view first
        const viewResult = await supabase
          .from("orders_with_drivers")
          .select(`
            id,
            order_number,
            status,
            assigned_driver_id,
            assigned_driver_name,
            assigned_driver_email,
            tenant_id,
            loading_point_name,
            loading_point_address,
            unloading_point_name,
            unloading_point_address,
            delivery_instructions,
            contact_name,
            contact_phone,
            created_at,
            updated_at,
            qr_code_data
          `)
          .eq("tenant_id", userData.tenant_id)
          .order(sortBy, { ascending: sortOrder === "asc" })
          .range(from, to);

        if (viewResult.error && (viewResult.error.code === "42P01" || viewResult.error.message.includes("does not exist"))) {
          // View doesn't exist or has column issues, use manual join
          console.log("orders_with_drivers view issue detected, using manual join:", viewResult.error.message);
          
          const manualResult = await supabase
            .from("orders")
            .select(`
              *,
              assigned_driver:users(id, full_name, email)
            `)
            .eq("tenant_id", userData.tenant_id)
            .order(sortBy, { ascending: sortOrder === "asc" })
            .range(from, to);
            
          data = manualResult.data;
          error = manualResult.error;
        } else if (viewResult.error) {
          // Other view error, fall back to manual join
          console.log("View error, falling back to manual join:", viewResult.error.message);
          const manualResult = await supabase
            .from("orders")
            .select(`
              *,
              assigned_driver:users(id, full_name, email)
            `)
            .eq("tenant_id", userData.tenant_id)
            .order(sortBy, { ascending: sortOrder === "asc" })
            .range(from, to);
            
          data = manualResult.data;
          error = manualResult.error;
        } else {
          // Transform view data to match expected format
          data = (viewResult.data || []).map(order => ({
            ...order,
            assigned_driver: order.assigned_driver_name ? {
              id: order.assigned_driver_id,
              full_name: order.assigned_driver_name,
              email: order.assigned_driver_email
            } : null
          }));
          error = viewResult.error;
        }
      } catch (queryError: any) {
        console.error("Query error, falling back to basic query:", queryError);
        
        // Ultimate fallback: basic query without driver info
        const basicResult = await supabase
          .from("orders")
          .select("*")
          .eq("tenant_id", userData.tenant_id)
          .order(sortBy, { ascending: sortOrder === "asc" })
          .range(from, to);
          
        data = basicResult.data;
        error = basicResult.error;
      }

      if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`);
      }

      setOrders(data || []);

      // Update debug info
      setDebugInfo((prev) => ({
        ...prev,
        orderCount: count || 0,
        lastError: null,
      }));
    } catch (error: any) {
      setDebugInfo((prev) => ({
        ...prev,
        lastError: error.message,
      }));
      handleApiError(error, "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToOrders = () => {
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
          console.log("Orders Page - Order change detected, refreshing...");
          fetchOrders(currentPage).catch((error) => {
            handleApiError(error, "Failed to update orders");
          });
        }
      )
      .subscribe();

    // Also subscribe to driver changes to refresh driver data
    const driversChannel = supabase
      .channel("orders_drivers_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: "role=eq.driver",
        },
        () => {
          console.log("Orders Page - Driver data change detected, refreshing...");
          fetchOrders(currentPage).catch((error) => {
            handleApiError(error, "Failed to update orders after driver change");
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(driversChannel);
    };
  };

  const filterAndSortOrders = () => {
    let result = [...orders];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(term) ||
          (order.sku && order.sku.toLowerCase().includes(term)) ||
          order.loading_point_name.toLowerCase().includes(term) ||
          order.unloading_point_name.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(result);
  };

  const handleGenerateQR = async (orderId: string) => {
    try {
      setLoading(true);

      console.log("🔄 Starting QR code generation for order:", orderId);

      // First test the QR code flow to ensure everything works
      const testResult = await testQRCodeFlow(orderId);
      console.log("🧪 QR code test result:", testResult);

      if (!testResult.generation) {
        throw new Error(
          "QR code generation test failed: " + testResult.details.error
        );
      }

      // Generate the actual QR code
      const qrResult = await generateQRCode(orderId);
      console.log("✅ QR code generated successfully:", {
        mobileUrl: qrResult.mobileUrl,
        webUrl: qrResult.webUrl,
        dataLength: qrResult.data.length,
        dataPreview: qrResult.data.substring(0, 100) + "...",
      });

      // Find the order for better filename
      const order = orders.find((o) => o.id === orderId);

      // Download the QR code with proper filename
      downloadQRCode(qrResult.image, orderId, order?.order_number);

      // Show success with additional info
      const successMessage = `QR code generated successfully! 
      📱 Mobile app link: ${qrResult.mobileUrl}
      🌐 Web fallback: ${qrResult.webUrl}`;
      handleSuccess(successMessage);

      // Log the mobile app URL for debugging
      console.log("📱 Mobile app deep link:", qrResult.mobileUrl);
      console.log("🌐 Web fallback URL:", qrResult.webUrl);
      console.log(
        "🔍 QR validation test:",
        testResult.validation ? "✅ PASSED" : "❌ FAILED"
      );

      // Additional debugging: show what's actually in the QR code
      console.log("🔍 QR Code contains:", qrResult.data);
    } catch (error: any) {
      console.error("❌ QR Generation Error:", error);

      // Enhanced QR error handling with specific solutions
      let errorMessage = "Failed to generate QR code";
      let suggestion = "";

      if (error.message.includes("Not authenticated")) {
        errorMessage = "Authentication expired";
        suggestion = "Please refresh the page and try again.";
      } else if (error.message.includes("Insufficient permissions")) {
        errorMessage = "Permission denied";
        suggestion =
          "You don't have permission to generate QR codes for this order.";
      } else if (error.message.includes("Order not found")) {
        errorMessage = "Order not accessible";
        suggestion =
          "This order may have been deleted or you don't have access to it.";
      } else if (error.message.includes("Edge function")) {
        errorMessage = "Using fallback QR generation";
        suggestion =
          "QR code generated with basic method. Contact administrator if issues persist.";

        // If edge function fails, try client-side generation as last resort
        try {
          console.log("🔄 Attempting fallback QR generation...");
          const qrResult = await generateQRCode(orderId);
          const order = orders.find((o) => o.id === orderId);
          downloadQRCode(qrResult.image, orderId, order?.order_number);
          handleSuccess("QR code generated using fallback method");
          return;
        } catch (fallbackError) {
          console.error(
            "❌ Fallback QR generation also failed:",
            fallbackError
          );
        }
      } else if (error.message.includes("Canvas not supported")) {
        errorMessage = "Browser compatibility issue";
        suggestion =
          "Please try using a modern browser (Chrome, Firefox, Safari, Edge).";
      }

      const fullMessage = suggestion
        ? `${errorMessage}. ${suggestion}`
        : errorMessage;
      handleApiError(new Error(fullMessage), "QR Code Generation Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
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
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }

      if (!userData) {
        throw new Error(
          "User not found in database. Please ensure your profile is set up."
        );
      }

      if (!userData.tenant_id) {
        throw new Error(
          "User is not linked to any organization. Please contact your administrator."
        );
      }

      // Create order with QR code placeholder
      const orderNumber = `ORD-${Date.now()}`;
      const qrCodeData = `${orderNumber}-${Date.now()}`;

      // Determine status based on driver assignment
      const status = orderData.assigned_driver_id ? 'assigned' : 'pending';

      // Build the insert object
      const insertData: any = {
        tenant_id: userData.tenant_id,
        order_number: orderNumber,
        qr_code_data: qrCodeData,
        qr_code_signature: "pending",
        status: status,
        created_by: session.user.id,
        ...orderData,
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(insertData)
        .select()
        .maybeSingle();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      if (!order) {
        throw new Error("Order was not created");
      }

      // Send notification if driver assigned
      if (orderData.assigned_driver_id) {
        try {
          await supabase.from('notifications').insert({
            tenant_id: userData.tenant_id,
            user_id: orderData.assigned_driver_id,
            order_id: order.id,
            notification_type: 'status_change',
            title: 'New Order Assigned',
            message: `Order ${order.order_number} has been assigned to you. Please review the details and activate the load when ready.`,
            metadata: {
              order_number: order.order_number,
              created_at: new Date().toISOString()
            }
          });
          console.log('✅ Notification sent to driver');
        } catch (notifError) {
          console.warn('Failed to send notification:', notifError);
          // Don't fail the order creation if notification fails
        }
      }

      // Try to generate QR code (optional - don't fail if this errors)
      try {
        await generateQRCode(order.id);
        const successMessage = orderData.assigned_driver_id
          ? "Order created and assigned to driver successfully! QR code has been generated. The driver has been notified."
          : "Order created successfully! QR code has been generated and downloaded.";
        handleSuccess(successMessage);
      } catch (qrError: any) {
        console.warn("QR generation failed:", qrError);
        const warningMessage = orderData.assigned_driver_id
          ? "Order created and assigned to driver! (QR code generation failed - you can generate it later)"
          : "Order created successfully! (QR code generation failed - you can generate it later)";
        toast(warningMessage, {
          icon: "⚠️",
        });
      }

      setShowCreateModal(false);
      await fetchOrders(currentPage);
    } catch (error: any) {
      handleApiError(error, "Failed to create order");
    }
  };

  const handleUpdateOrder = async (orderData: Partial<Order>) => {
    if (!editingOrder) return;

    try {
      console.log("Updating order with data:", orderData);
      console.log("Original order:", editingOrder);
      
      // If updating driver assignment, verify the driver exists and has proper tenant_id
      // Only validate if assigned_driver_id is provided and not being cleared
      if (orderData.assigned_driver_id && orderData.assigned_driver_id !== "") {
        const { data: driverData, error: driverError } = await supabase
          .from("users")
          .select("id, full_name, tenant_id, role")
          .eq("id", orderData.assigned_driver_id)
          .eq("role", "driver")
          .maybeSingle(); // ✅ Use maybeSingle() instead of single() to handle no results

        // Only throw error if there was a database error (not just no results)
        if (driverError) {
          console.error("Driver validation error:", driverError);
          throw new Error(`Driver validation failed: ${driverError.message}`);
        }

        // If no driver found with this ID
        if (!driverData) {
          throw new Error(`Driver not found with ID: ${orderData.assigned_driver_id}. Please select a valid driver.`);
        }

        console.log("Driver data:", driverData);
        
        // Check if driver's tenant_id matches order's tenant_id
        if (driverData.tenant_id !== editingOrder.tenant_id) {
          console.warn(`Tenant mismatch - Driver: ${driverData.tenant_id}, Order: ${editingOrder.tenant_id}`);
          // Allow it but warn - some deployments may have cross-tenant assignment
        }
      } else if (orderData.assigned_driver_id === "" || orderData.assigned_driver_id === null) {
        // ✅ Clearing driver assignment - ensure it's explicitly set to undefined
        orderData.assigned_driver_id = undefined;
        console.log("Clearing driver assignment");
      }

      const { data: updatedOrder, error } = await supabase
        .from("orders")
        .update(orderData)
        .eq("id", editingOrder.id)
        .select(`
          *,
          assigned_driver:users!orders_assigned_driver_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .maybeSingle();

      if (error) {
        console.error("Update error:", error);
        throw new Error(`Failed to update order: ${error.message}`);
      }

      console.log("Updated order result:", updatedOrder);

      handleSuccess("Order updated successfully!");
      setShowEditModal(false);
      setEditingOrder(null);
      await fetchOrders(currentPage);
    } catch (error: any) {
      console.error("Full update error:", error);
      handleApiError(error, "Failed to update order");
    }
  };

  const handleExportToPDF = async (order: Order) => {
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

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setShowEditModal(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;

      handleSuccess("Order deleted successfully!");
      await fetchOrders(currentPage);
    } catch (error: any) {
      console.error("Delete error:", error);
      handleApiError(error, "Failed to delete order");
    } finally {
      setLoading(false);
    }
  };

  const runQuickDiagnostic = async () => {
    try {
      setLoading(true);
      await performDiagnostics(user);
      handleSuccess("Diagnostic completed - check the debug panel for details");
    } catch (error: any) {
      handleApiError(error, "Diagnostic failed");
    } finally {
      setLoading(false);
    }
  };

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

  const handleSort = (field: "created_at" | "order_number" | "status") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchOrders(page).catch((error) => {
        handleApiError(error, "Failed to change page");
      });
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      handleSuccess("You have been logged out successfully");
    } catch (error) {
      handleApiError(error, "Failed to logout");
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading orders...</div>
        <button
          onClick={runQuickDiagnostic}
          className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          Run Diagnostic
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug panel */}
      {debugInfo.lastError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-red-700">
                <strong>System Error:</strong> {debugInfo.lastError}
              </p>
            </div>
            <button
              onClick={() => setShowDebugModal(true)}
              className="text-red-600 hover:text-red-800 text-sm underline"
            >
              Show Debug Info
            </button>
          </div>
        </div>
      )}

      {/* Mobile header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
            >
              Create
            </button>
            <button
              onClick={() => setShowDebugModal(true)}
              className="px-3 py-1 bg-yellow-600 text-white rounded-md text-sm"
            >
              Debug
            </button>
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
              Orders Management
            </h1>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hidden md:block"
              >
                Create New Order
              </button>
              <button
                onClick={runQuickDiagnostic}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 hidden md:block"
              >
                Run Diagnostic
              </button>
              <button
                onClick={() => setShowDebugModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hidden md:block"
              >
                Debug Info
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

        {/* Status Summary */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {orders.length}
              </div>
              <div className="text-sm text-gray-500">Total Orders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter((o) => o.status === "pending").length}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {orders.filter((o) => o.status === "completed").length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {
                  orders.filter((o) =>
                    ["in_transit", "loading", "unloading"].includes(o.status)
                  ).length
                }
              </div>
              <div className="text-sm text-gray-500">In Progress</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search Orders
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by order number, SKU, or location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filter by Status
              </label>
              <select
                id="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as OrderStatus | "all")
                }
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="in_transit">In Transit</option>
                <option value="arrived">Arrived</option>
                <option value="loading">Loading</option>
                <option value="loaded">Loaded</option>
                <option value="unloading">Unloading</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("order_number")}
                  >
                    <div className="flex items-center">
                      Order Number
                      {sortBy === "order_number" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center">
                      Status
                      {sortBy === "status" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
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
                  <th
                    className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center">
                      Created
                      {sortBy === "created_at" && (
                        <span className="ml-1">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 md:px-6 py-8 text-center">
                      <div className="text-gray-500">
                        {orders.length === 0 ? (
                          <div>
                            <p className="text-lg mb-2">No orders found</p>
                            <p className="text-sm mb-4">
                              Get started by creating your first order
                            </p>
                            <button
                              onClick={() => setShowCreateModal(true)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Create First Order
                            </button>
                          </div>
                        ) : (
                          <p>No orders match your search criteria</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.order_number}
                        </div>
                        {order.sku && (
                          <div className="text-xs text-gray-500">
                            SKU: {order.sku}
                          </div>
                        )}
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
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleGenerateQR(order.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Generate QR Code"
                          >
                            QR
                          </button>
                          <button
                            onClick={() => {
                              setDebugOrderId(order.id);
                              setShowQRDebugger(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Debug QR Code"
                          >
                            🧪
                          </button>
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit Order"
                          >
                            Edit
                          </button>
                          {(order.status === 'assigned' || order.status === 'activated' || order.status === 'in_progress' || order.status === 'in_transit' || order.status === 'loaded' || order.status === 'unloading' || order.status === 'completed') && (
                            <>
                              <button
                                onClick={() => {
                                  const link = `${window.location.origin}/tracking/${order.id}/public`;
                                  setTrackingLink(link);
                                  setShowTrackingModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 font-semibold"
                                title="Get Tracking Link"
                              >
                                🔗 Track
                              </button>
                              <button
                                onClick={() => window.open(`/tracking/${order.id}/public`, '_blank')}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Open Tracking Page"
                              >
                                � View
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Order"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleExportToPDF(order)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Export to PDF"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 md:px-6 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span>{" "}
                of <span className="font-medium">{totalPages}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-md ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debug Modal */}
      {showDebugModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">
                  System Debug Information
                </h2>
                <button
                  onClick={() => setShowDebugModal(false)}
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

            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">User Status</h3>
                <p className="text-sm text-gray-600">{debugInfo.userStatus}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">
                  Tenant Information
                </h3>
                <pre className="text-sm text-gray-600 bg-gray-100 p-2 rounded">
                  {JSON.stringify(debugInfo.tenantInfo, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Order Count</h3>
                <p className="text-sm text-gray-600">
                  {debugInfo.orderCount} orders visible to current user
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">RLS Status</h3>
                <p className="text-sm text-gray-600">{debugInfo.rlsStatus}</p>
              </div>

              {debugInfo.lastError && (
                <div>
                  <h3 className="font-semibold text-red-900">Last Error</h3>
                  <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
                    {debugInfo.lastError}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={runQuickDiagnostic}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Run Diagnostic
                </button>
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Order Form Modals */}
      {showCreateModal && (
        <EnhancedOrderForm
          onSubmit={handleCreateOrder}
          onCancel={() => setShowCreateModal(false)}
          isEditing={false}
        />
      )}

      {showEditModal && editingOrder && (
        <EnhancedOrderForm
          order={editingOrder}
          onSubmit={handleUpdateOrder}
          onCancel={() => {
            setShowEditModal(false);
            setEditingOrder(null);
          }}
          isEditing={true}
        />
      )}

      {/* QR Code Debugger */}
      {showQRDebugger && debugOrderId && (
        <QRDebugger
          orderId={debugOrderId}
          onClose={() => {
            setShowQRDebugger(false);
            setDebugOrderId("");
          }}
        />
      )}

      {/* Tracking Link Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">📍 Customer Tracking Link</h2>
              <button
                onClick={() => setShowTrackingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Share this link with your customer to let them track the delivery in real-time:
                </p>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <code className="text-sm text-blue-600 break-all">{trackingLink}</code>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(trackingLink);
                    handleSuccess("Tracking link copied to clipboard!");
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </button>

                <button
                  onClick={() => window.open(trackingLink, '_blank')}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Link
                </button>

                <button
                  onClick={() => {
                    const subject = encodeURIComponent("Track Your Delivery");
                    const body = encodeURIComponent(`You can track your delivery in real-time here:\n\n${trackingLink}\n\nThank you!`);
                    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Features:</strong> The tracking page shows live driver location, 
                  route history, trip distance, duration, and automatically refreshes every 10 minutes.
                  No login required!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
