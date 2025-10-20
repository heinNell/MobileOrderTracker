"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Order, TransporterSupplier } from "../../shared/types";

// Simplified driver type for form selection
interface DriverOption {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

// Geofence type for location selection
interface GeofenceOption {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  location_text?: string;
}

interface OrderFormProps {
  order?: Order;
  onSubmit: (orderData: Partial<Order>) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export default function EnhancedOrderForm({
  order,
  onSubmit,
  onCancel,
  isEditing = false,
}: OrderFormProps) {
  const [availableDrivers, setAvailableDrivers] = useState<DriverOption[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [availableGeofences, setAvailableGeofences] = useState<GeofenceOption[]>([]);
  const [loadingGeofences, setLoadingGeofences] = useState(false);
  const [formData, setFormData] = useState({
    // Basic order info
    assigned_driver_id: order?.assigned_driver_id || "",
    sku: order?.sku || "",
    loading_point_name: order?.loading_point_name || "",
    loading_point_address: order?.loading_point_address || "",
    loading_lat: "",
    loading_lng: "",
    unloading_point_name: order?.unloading_point_name || "",
    unloading_point_address: order?.unloading_point_address || "",
    unloading_lat: "",
    unloading_lng: "",
    estimated_distance: order?.estimated_distance_km?.toString() || "",
    estimated_duration: order?.estimated_duration_minutes?.toString() || "",
    delivery_instructions: order?.delivery_instructions || "",
    special_handling_instructions: order?.special_handling_instructions || "",
    contact_name: order?.contact_name || "",
    contact_phone: order?.contact_phone || "",

    // Transporter supplier info
    transporter_name: order?.transporter_supplier?.name || "",
    transporter_phone: order?.transporter_supplier?.contact_phone || "",
    transporter_email: order?.transporter_supplier?.contact_email || "",
    transporter_cost:
      order?.transporter_supplier?.cost_amount?.toString() || "",
    transporter_currency: order?.transporter_supplier?.cost_currency || "USD",
    transporter_notes: order?.transporter_supplier?.notes || "",
  });

  const [activeTab, setActiveTab] = useState<
    "basic" | "driver" | "locations" | "transporter" | "additional"
  >("basic");
  const [loading, setLoading] = useState(false);

  // Fetch available drivers and geofences on component mount
  useEffect(() => {
    fetchDrivers();
    fetchGeofences();
  }, []);

  // Initialize form data when order prop changes (for editing)
  useEffect(() => {
    if (order && isEditing) {
      console.log("Initializing form with order data:", order);
      
      // Parse coordinates from PostGIS format if needed
      let loadingLat = "";
      let loadingLng = "";
      let unloadingLat = "";
      let unloadingLng = "";

      try {
        if (typeof order.loading_point_location === "string") {
          const match = order.loading_point_location.match(/POINT\(([^)]+)\)/);
          if (match) {
            const [lng, lat] = match[1].split(" ").map(Number);
            loadingLat = lat.toString();
            loadingLng = lng.toString();
          }
        }

        if (typeof order.unloading_point_location === "string") {
          const match = order.unloading_point_location.match(/POINT\(([^)]+)\)/);
          if (match) {
            const [lng, lat] = match[1].split(" ").map(Number);
            unloadingLat = lat.toString();
            unloadingLng = lng.toString();
          }
        }
      } catch (error) {
        console.warn("Failed to parse coordinates:", error);
      }

      // Set all form fields from order data
      setFormData({
        assigned_driver_id: order.assigned_driver_id || "",
        sku: order.sku || "",
        loading_point_name: order.loading_point_name || "",
        loading_point_address: order.loading_point_address || "",
        loading_lat: loadingLat,
        loading_lng: loadingLng,
        unloading_point_name: order.unloading_point_name || "",
        unloading_point_address: order.unloading_point_address || "",
        unloading_lat: unloadingLat,
        unloading_lng: unloadingLng,
        estimated_distance: order.estimated_distance_km?.toString() || "",
        estimated_duration: order.estimated_duration_minutes?.toString() || "",
        delivery_instructions: order.delivery_instructions || "",
        special_handling_instructions: order.special_handling_instructions || "",
        contact_name: order.contact_name || "",
        contact_phone: order.contact_phone || "",
        transporter_name: order.transporter_supplier?.name || "",
        transporter_phone: order.transporter_supplier?.contact_phone || "",
        transporter_email: order.transporter_supplier?.contact_email || "",
        transporter_cost: order.transporter_supplier?.cost_amount?.toString() || "",
        transporter_currency: order.transporter_supplier?.cost_currency || "USD",
        transporter_notes: order.transporter_supplier?.notes || "",
      });
    }
  }, [order, isEditing]);

  const fetchGeofences = async () => {
    try {
      setLoadingGeofences(true);

      // Get current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session");
        return;
      }

      // Get user's tenant_id
      const { data: userData } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!userData?.tenant_id) {
        console.error("User has no tenant_id");
        return;
      }

      console.log(`Fetching geofences for tenant ${userData.tenant_id}`);

      // Fetch geofences - use enhanced_geofences table
      const { data: geofences, error } = await supabase
        .from("enhanced_geofences")
        .select("id, geofence_name, center_latitude, center_longitude, radius_meters, geofence_type")
        .eq("tenant_id", userData.tenant_id)
        .eq("is_active", true)
        .order("geofence_name");

      if (error) {
        console.error("Error fetching from enhanced_geofences, trying old geofences table:", error);
        
        // Fallback to old geofences table
        const { data: fallbackGeofences, error: fallbackError } = await supabase
          .from("geofences")
          .select("id, name, location, radius_meters")
          .eq("tenant_id", userData.tenant_id)
          .eq("is_active", true)
          .order("name");

        if (fallbackError) {
          console.error("Error fetching geofences:", fallbackError);
          return;
        }

        // Parse location from PostGIS format
        const parsedGeofences = (fallbackGeofences || []).map(g => {
          let lat = 0, lng = 0;
          if (g.location && typeof g.location === 'string') {
            const match = g.location.match(/POINT\(([^)]+)\)/);
            if (match) {
              [lng, lat] = match[1].split(" ").map(Number);
            }
          }
          return {
            id: g.id,
            name: g.name,
            latitude: lat,
            longitude: lng,
            radius_meters: g.radius_meters
          };
        });

        setAvailableGeofences(parsedGeofences);
        console.log(`Loaded ${parsedGeofences.length} geofences (fallback from old table)`);
        return;
      }

      // Parse geofences from enhanced_geofences table
      const parsedGeofences = (geofences || []).map(g => {
        return {
          id: g.id,
          name: g.geofence_name,
          latitude: g.center_latitude || 0,
          longitude: g.center_longitude || 0,
          radius_meters: g.radius_meters,
          geofence_type: g.geofence_type
        };
      });

      setAvailableGeofences(parsedGeofences);
      console.log(`Loaded ${parsedGeofences.length} geofences from enhanced_geofences table`);
    } catch (error) {
      console.error("Error in fetchGeofences:", error);
    } finally {
      setLoadingGeofences(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      setLoadingDrivers(true);

      // Get current user's session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session");
        return;
      }

      // Get user's tenant_id
      const { data: userData } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!userData?.tenant_id) {
        console.error("User has no tenant_id");
        return;
      }

      console.log(`EnhancedOrderForm: Fetching drivers for tenant ${userData.tenant_id}`);

      // Fetch ALL drivers in the same tenant (including inactive)
      const { data: drivers, error } = await supabase
        .from("users")
        .select("id, full_name, phone, email, is_active")
        .eq("role", "driver")
        .eq("tenant_id", userData.tenant_id)
        .order("is_active", { ascending: false })  // Active first
        .order("full_name");

      if (error) {
        console.error("Error fetching drivers:", error);
        return;
      }

      console.log(`EnhancedOrderForm: Loaded ${drivers?.length || 0} drivers (${drivers?.filter(d => d.is_active).length || 0} active, ${drivers?.filter(d => !d.is_active).length || 0} inactive)`);

      setAvailableDrivers(drivers || []);
    } catch (error) {
      console.error("Error in fetchDrivers:", error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoadingGeofenceSelect = (geofenceId: string) => {
    if (!geofenceId) {
      // Clear selection - allow manual entry
      return;
    }

    const geofence = availableGeofences.find(g => g.id === geofenceId);
    if (geofence) {
      setFormData((prev) => ({
        ...prev,
        loading_point_name: geofence.name,
        loading_point_address: geofence.name, // Use name as address if no separate address field in geofence
        loading_lat: geofence.latitude.toString(),
        loading_lng: geofence.longitude.toString(),
      }));
    }
  };

  const handleUnloadingGeofenceSelect = (geofenceId: string) => {
    if (!geofenceId) {
      // Clear selection - allow manual entry
      return;
    }

    const geofence = availableGeofences.find(g => g.id === geofenceId);
    if (geofence) {
      setFormData((prev) => ({
        ...prev,
        unloading_point_name: geofence.name,
        unloading_point_address: geofence.name,
        unloading_lat: geofence.latitude.toString(),
        unloading_lng: geofence.longitude.toString(),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      const requiredFields = [
        "loading_point_name",
        "loading_point_address",
        "loading_lat",
        "loading_lng",
        "unloading_point_name",
        "unloading_point_address",
        "unloading_lat",
        "unloading_lng",
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          throw new Error(`Field ${field} is required`);
        }
      }

      // Validate coordinates
      const loadingLat = parseFloat(formData.loading_lat);
      const loadingLng = parseFloat(formData.loading_lng);
      const unloadingLat = parseFloat(formData.unloading_lat);
      const unloadingLng = parseFloat(formData.unloading_lng);

      if (
        isNaN(loadingLat) ||
        isNaN(loadingLng) ||
        isNaN(unloadingLat) ||
        isNaN(unloadingLng)
      ) {
        throw new Error("Invalid coordinates provided");
      }

      // Build transporter supplier object
      const transporterSupplier: TransporterSupplier | undefined =
        formData.transporter_name
          ? {
              name: formData.transporter_name,
              contact_phone: formData.transporter_phone || undefined,
              contact_email: formData.transporter_email || undefined,
              cost_amount: formData.transporter_cost
                ? parseFloat(formData.transporter_cost)
                : undefined,
              cost_currency: formData.transporter_currency || undefined,
              notes: formData.transporter_notes || undefined,
            }
          : undefined;

      // Build order data
      const orderData: Partial<Order> = {
        assigned_driver_id: formData.assigned_driver_id || undefined,
        sku: formData.sku || undefined,
        loading_point_name: formData.loading_point_name,
        loading_point_address: formData.loading_point_address,
        loading_point_location: `SRID=4326;POINT(${loadingLng} ${loadingLat})`,
        unloading_point_name: formData.unloading_point_name,
        unloading_point_address: formData.unloading_point_address,
        unloading_point_location: `SRID=4326;POINT(${unloadingLng} ${unloadingLat})`,
        estimated_distance_km: formData.estimated_distance
          ? parseFloat(formData.estimated_distance)
          : undefined,
        estimated_duration_minutes: formData.estimated_duration
          ? parseInt(formData.estimated_duration)
          : undefined,
        delivery_instructions: formData.delivery_instructions || undefined,
        special_handling_instructions:
          formData.special_handling_instructions || undefined,
        contact_name: formData.contact_name || undefined,
        contact_phone: formData.contact_phone || undefined,
        transporter_supplier: transporterSupplier,
      };

      await onSubmit(orderData);
    } catch (error: any) {
      alert(error.message || "Failed to save order");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: "📋" },
    { id: "driver", label: "Driver", icon: "👤" },
    { id: "locations", label: "Locations", icon: "📍" },
    { id: "transporter", label: "Transporter", icon: "🚚" },
    { id: "additional", label: "Additional", icon: "📝" },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? "Edit Order" : "Create New Order"}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
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

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto max-h-[calc(90vh-180px)]"
        >
          <div className="p-6">
            {/* Basic Information Tab */}
            {activeTab === "basic" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Basic Order Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU / Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleInputChange("sku", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., SKU-12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={formData.contact_name}
                      onChange={(e) =>
                        handleInputChange("contact_name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Customer contact name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) =>
                        handleInputChange("contact_phone", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Distance (km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.estimated_distance}
                      onChange={(e) =>
                        handleInputChange("estimated_distance", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="50"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_duration}
                      onChange={(e) =>
                        handleInputChange("estimated_duration", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="60"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Driver Assignment Tab */}
            {activeTab === "driver" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Driver Assignment
                </h3>
                <p className="text-sm text-gray-600">
                  Assign a driver to this order. The driver will receive a
                  notification and can activate the load in the mobile app.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Driver
                    </label>
                    {loadingDrivers ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">
                          Loading drivers...
                        </span>
                      </div>
                    ) : availableDrivers.length === 0 ? (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          No active drivers available in your organization.
                          Please add drivers first or leave unassigned.
                        </p>
                      </div>
                    ) : (
                      <select
                        value={formData.assigned_driver_id}
                        onChange={(e) =>
                          handleInputChange(
                            "assigned_driver_id",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">
                          Unassigned (will be pending status)
                        </option>
                        {availableDrivers.map((driver) => (
                          <option 
                            key={driver.id} 
                            value={driver.id}
                            style={{
                              color: driver.is_active ? 'inherit' : '#ef4444',
                              fontWeight: driver.is_active ? 'normal' : 'bold'
                            }}
                          >
                            {!driver.is_active && '⚠️ INACTIVE - '}
                            {driver.full_name}
                            {driver.phone && ` - ${driver.phone}`}
                            {driver.email && ` (${driver.email})`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {formData.assigned_driver_id && (
                    (() => {
                      const selectedDriver = availableDrivers.find(d => d.id === formData.assigned_driver_id);
                      const isInactive = selectedDriver && !selectedDriver.is_active;
                      return (
                        <div className={`p-4 border rounded-md ${
                          isInactive 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start">
                            <svg
                              className={`w-5 h-5 mt-0.5 mr-2 ${
                                isInactive ? 'text-red-600' : 'text-blue-600'
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d={isInactive 
                                  ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  : "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                }
                              />
                            </svg>
                            <div>
                              {isInactive ? (
                                <>
                                  <p className="text-sm font-medium text-red-900">
                                    ⚠️ Warning: Inactive Driver Selected
                                  </p>
                                  <p className="text-sm text-red-700 mt-1">
                                    This driver is currently marked as INACTIVE. They will still
                                    receive the notification, but they may not be available for
                                    this order. Consider selecting an active driver instead.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-blue-900">
                                    Driver will be notified
                                  </p>
                                  <p className="text-sm text-blue-700 mt-1">
                                    When you create this order, the selected driver will
                                    receive a push notification and the order status
                                    will be set to "assigned". The driver can then
                                    activate the load and start the delivery process.
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {!formData.assigned_driver_id && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                      <div className="flex items-start">
                        <svg
                          className="w-5 h-5 text-gray-600 mt-0.5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Unassigned Order
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            The order will be created with "pending" status and
                            you can assign a driver later from the orders list.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Locations Tab */}
            {activeTab === "locations" && (
              <div className="space-y-8">
                {/* Loading Point */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Loading Point
                  </h3>
                  
                  {/* Geofence Selector */}
                  {loadingGeofences ? (
                    <div className="flex items-center justify-center py-4 mb-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 text-sm">Loading locations...</span>
                    </div>
                  ) : availableGeofences.length > 0 ? (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <label className="block text-sm font-medium text-blue-900 mb-2">
                        📍 Quick Select from Saved Locations
                      </label>
                      <select
                        onChange={(e) => handleLoadingGeofenceSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="">-- Select a saved location or enter manually below --</option>
                        {availableGeofences.map((geofence) => (
                          <option key={geofence.id} value={geofence.id}>
                            {geofence.name} ({geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-blue-700 mt-2">
                        💡 Tip: Select a location to auto-fill the fields below, or enter details manually
                      </p>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.loading_point_name}
                        onChange={(e) =>
                          handleInputChange(
                            "loading_point_name",
                            e.target.value
                          )
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Warehouse A"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.loading_point_address}
                        onChange={(e) =>
                          handleInputChange(
                            "loading_point_address",
                            e.target.value
                          )
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 123 Main St, City, Country"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.loading_lat}
                        onChange={(e) =>
                          handleInputChange("loading_lat", e.target.value)
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., -26.2041"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.loading_lng}
                        onChange={(e) =>
                          handleInputChange("loading_lng", e.target.value)
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 28.0473"
                      />
                    </div>
                  </div>
                </div>

                {/* Unloading Point */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Unloading Point (Destination)
                  </h3>
                  
                  {/* Geofence Selector */}
                  {loadingGeofences ? (
                    <div className="flex items-center justify-center py-4 mb-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      <span className="ml-2 text-gray-600 text-sm">Loading locations...</span>
                    </div>
                  ) : availableGeofences.length > 0 ? (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                      <label className="block text-sm font-medium text-green-900 mb-2">
                        📍 Quick Select from Saved Locations
                      </label>
                      <select
                        onChange={(e) => handleUnloadingGeofenceSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                      >
                        <option value="">-- Select a saved location or enter manually below --</option>
                        {availableGeofences.map((geofence) => (
                          <option key={geofence.id} value={geofence.id}>
                            {geofence.name} ({geofence.latitude.toFixed(4)}, {geofence.longitude.toFixed(4)})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-green-700 mt-2">
                        💡 Tip: Select a location to auto-fill the fields below, or enter details manually
                      </p>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.unloading_point_name}
                        onChange={(e) =>
                          handleInputChange(
                            "unloading_point_name",
                            e.target.value
                          )
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Customer Location"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.unloading_point_address}
                        onChange={(e) =>
                          handleInputChange(
                            "unloading_point_address",
                            e.target.value
                          )
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 456 Oak Ave, City, Country"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Latitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.unloading_lat}
                        onChange={(e) =>
                          handleInputChange("unloading_lat", e.target.value)
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., -25.7479"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Longitude <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.unloading_lng}
                        onChange={(e) =>
                          handleInputChange("unloading_lng", e.target.value)
                        }
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 28.2293"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transporter Tab */}
            {activeTab === "transporter" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transporter Supplier Information
                </h3>
                <p className="text-sm text-gray-600">
                  Add details about the transporter responsible for this
                  delivery.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.transporter_name}
                      onChange={(e) =>
                        handleInputChange("transporter_name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Express Logistics Inc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.transporter_phone}
                      onChange={(e) =>
                        handleInputChange("transporter_phone", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={formData.transporter_email}
                      onChange={(e) =>
                        handleInputChange("transporter_email", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="contact@expresslogistics.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.transporter_cost}
                      onChange={(e) =>
                        handleInputChange("transporter_cost", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1500.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.transporter_currency}
                      onChange={(e) =>
                        handleInputChange(
                          "transporter_currency",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="ZAR">ZAR</option>
                      <option value="NGN">NGN</option>
                      <option value="KES">KES</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.transporter_notes}
                      onChange={(e) =>
                        handleInputChange("transporter_notes", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional information about the transporter or specific requirements..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information Tab */}
            {activeTab === "additional" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Additional Instructions
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Instructions
                    </label>
                    <textarea
                      value={formData.delivery_instructions}
                      onChange={(e) =>
                        handleInputChange(
                          "delivery_instructions",
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Special delivery instructions, access codes, contact requirements, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Handling Instructions
                    </label>
                    <textarea
                      value={formData.special_handling_instructions}
                      onChange={(e) =>
                        handleInputChange(
                          "special_handling_instructions",
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Fragile items, temperature requirements, equipment needed, etc."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading && (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isEditing ? "Update Order" : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}