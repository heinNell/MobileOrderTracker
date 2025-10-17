// Enhanced Orders Page Fix for Driver Assignment Display Issue
// This file contains the corrected fetchOrders function for the dashboard

// PROBLEM: The dashboard was using a foreign key relationship name that may not exist
// SOLUTION: Use explicit LEFT JOIN instead of relying on Supabase's automatic foreign key naming

const fetchOrdersFixed = async (page = 1) => {
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

    // FIXED QUERY: Use the view or explicit join instead of foreign key name
    // Option 1: Use the new view (recommended)
    const { data, error } = await supabase
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

    // Option 2: Alternative using RPC function (if view doesn't work)
    // const { data, error } = await supabase
    //   .rpc('get_orders_with_drivers', {
    //     p_tenant_id: userData.tenant_id,
    //     p_limit: ordersPerPage,
    //     p_offset: from,
    //     p_order_by: sortBy,
    //     p_order_direction: sortOrder
    //   });

    if (error) {
      console.error("Database error details:", error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    // Transform data to match expected format
    const transformedData = (data || []).map(order => ({
      ...order,
      assigned_driver: order.assigned_driver_name ? {
        id: order.assigned_driver_id,
        full_name: order.assigned_driver_name
      } : null
    }));

    setOrders(transformedData);

    // Update debug info
    setDebugInfo((prev) => ({
      ...prev,
      orderCount: count || 0,
      lastError: null,
    }));
  } catch (error) {
    console.error("fetchOrders error:", error);
    setDebugInfo((prev) => ({
      ...prev,
      lastError: error.message,
    }));
    handleApiError(error, "Failed to fetch orders");
  } finally {
    setLoading(false);
  }
};

// Alternative RPC function approach (create this in Supabase if needed)
/*
CREATE OR REPLACE FUNCTION get_orders_with_drivers(
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0,
    p_order_by TEXT DEFAULT 'created_at',
    p_order_direction TEXT DEFAULT 'desc'
)
RETURNS TABLE (
    id UUID,
    order_number TEXT,
    status order_status,
    assigned_driver_id UUID,
    assigned_driver_name TEXT,
    assigned_driver_email TEXT,
    tenant_id UUID,
    loading_point_name TEXT,
    loading_point_address TEXT,
    unloading_point_name TEXT,
    unloading_point_address TEXT,
    delivery_instructions TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    qr_code_data TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        o.id,
        o.order_number,
        o.status,
        o.assigned_driver_id,
        u.full_name as assigned_driver_name,
        u.email as assigned_driver_email,
        o.tenant_id,
        o.loading_point_name,
        o.loading_point_address,
        o.unloading_point_name,
        o.unloading_point_address,
        o.delivery_instructions,
        o.contact_name,
        o.contact_phone,
        o.created_at,
        o.updated_at,
        o.qr_code_data
    FROM public.orders o
    LEFT JOIN public.users u ON o.assigned_driver_id = u.id
    WHERE o.tenant_id = p_tenant_id
    ORDER BY 
        CASE WHEN p_order_by = 'created_at' AND p_order_direction = 'desc' THEN o.created_at END DESC,
        CASE WHEN p_order_by = 'created_at' AND p_order_direction = 'asc' THEN o.created_at END ASC,
        CASE WHEN p_order_by = 'order_number' AND p_order_direction = 'desc' THEN o.order_number END DESC,
        CASE WHEN p_order_by = 'order_number' AND p_order_direction = 'asc' THEN o.order_number END ASC,
        CASE WHEN p_order_by = 'status' AND p_order_direction = 'desc' THEN o.status::text END DESC,
        CASE WHEN p_order_by = 'status' AND p_order_direction = 'asc' THEN o.status::text END ASC
    LIMIT p_limit
    OFFSET p_offset;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_orders_with_drivers TO authenticated;
*/