"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase"; // Assuming this is typed or needs import adjustment
import type { User } from "../../shared/types";

// Define a more specific type for user instead of any (based on Supabase session.user)
interface SessionUser {
  id: string;
  email?: string;
  // Add other properties as needed from your auth setup
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newDriver, setNewDriver] = useState<{
    full_name: string;
    email: string;
    phone: string;
    license_number: string;
    license_expiry: string;
    password: string;
    generatePassword: boolean;
  }>({
    full_name: "",
    email: "",
    phone: "",
    license_number: "",
    license_expiry: "",
    password: "",
    generatePassword: true,
  });
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creationResult, setCreationResult] = useState<{
    success: boolean;
    message: string;
    temporaryPassword?: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm, statusFilter]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user as SessionUser); // Cast to our type
    fetchDrivers();
    subscribeToUsers();
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "driver")
        .order("full_name", { ascending: true });

      if (error) throw error;

      setDrivers(data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUsers = () => {
    const channel = supabase
      .channel("users_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterDrivers = () => {
    let result = [...drivers];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (driver) =>
          driver.full_name.toLowerCase().includes(term) ||
          driver.email.toLowerCase().includes(term) ||
          (driver.phone && driver.phone.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((driver) =>
        statusFilter === "active" ? driver.is_active : !driver.is_active
      );
    }

    setFilteredDrivers(result);
  };

  const handleCreateDriver = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);
    setCreationResult(null);

    // Client-side validation
    if (!newDriver.full_name.trim()) {
      setCreationResult({
        success: false,
        message: "Full name is required.",
      });
      setIsCreating(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newDriver.email.trim() || !emailRegex.test(newDriver.email.trim())) {
      setCreationResult({
        success: false,
        message: "A valid email is required.",
      });
      setIsCreating(false);
      return;
    }
    if (!newDriver.generatePassword && (!newDriver.password || newDriver.password.length < 8)) {
      setCreationResult({
        success: false,
        message: "Custom password must be at least 8 characters.",
      });
      setIsCreating(false);
      return;
    }
    // Optional: Phone validation (basic)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
    if (newDriver.phone.trim() && !phoneRegex.test(newDriver.phone.trim())) {
      setCreationResult({
        success: false,
        message: "Invalid phone number format (e.g., +1234567890).",
      });
      setIsCreating(false);
      return;
    }

    try {
      // Get current session for authorization
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Authentication required");
      }

      // Get current user's tenant_id with fallback
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", session.user.id)
        .single();

      if (userError) {
        console.error("Error fetching tenant_id:", userError);
      }

      // Prepare driver data
      const driverData = {
        email: newDriver.email.trim(),
        full_name: newDriver.full_name.trim(),
        phone: newDriver.phone.trim() || null,
        license_number: newDriver.license_number.trim() || null,
        license_expiry: newDriver.license_expiry || null,
        password: newDriver.generatePassword ? null : newDriver.password, // null triggers auto-generation in function
        tenant_id: userData?.tenant_id || null, // Fallback to null
      };

      // Use direct fetch for better error handling
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-driver-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(driverData),
        }
      );
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Handle specific status codes
        if (response.status === 409) {
          throw new Error(responseData.error || "Email already exists. Please use a different email address.");
        } else if (response.status === 422) {
          throw new Error(responseData.error || "Invalid input. Please check required fields.");
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("Authentication failed. Please log in again.");
        }
        throw new Error(responseData.error || `Error: ${response.status}`);
      }

      if (!responseData.success) {
        throw new Error(responseData.error || "Unknown error occurred");
      }

      // Success! Show result to user
      setCreationResult({
        success: true,
        message: `Driver account created successfully for ${responseData.data.full_name}`,
        temporaryPassword: responseData.data.temporary_password,
      });

      // Reset form
      setNewDriver({
        full_name: "",
        email: "",
        phone: "",
        license_number: "",
        license_expiry: "",
        password: "",
        generatePassword: true,
      });

      // Refresh drivers list
      fetchDrivers();

      console.log("Driver account created:", responseData.data);
    } catch (error: unknown) {
      console.error("Error creating driver:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create driver account";
      setCreationResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleDriverStatus = async (
    driverId: string,
    currentStatus: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_active: !currentStatus })
        .eq("id", driverId);

      if (error) throw error;

      // Refresh drivers
      fetchDrivers();
    } catch (error) {
      console.error("Error updating driver status:", error);
      alert("Failed to update driver status");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Drivers</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
            >
              Add
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
              Driver Management
            </h1>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hidden md:block"
              >
                Add New Driver
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 hidden md:block"
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Manage driver profiles and assignments
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Search Drivers
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name, email, or phone..."
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
                  setStatusFilter(
                    e.target.value as "all" | "active" | "inactive"
                  )
                }
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No drivers found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {driver.full_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {driver.email}
                        </div>
                        {driver.phone && (
                          <div className="text-sm text-gray-500">
                            {driver.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {driver.last_location_update ? (
                          <div>
                            <div>
                              {new Date(
                                driver.last_location_update
                              ).toLocaleString()}
                            </div>
                            {driver.last_location && 
                             driver.last_location.latitude !== undefined && 
                             driver.last_location.longitude !== undefined && (
                              <div className="text-xs">
                                {driver.last_location.latitude.toFixed(6)},{" "}
                                {driver.last_location.longitude.toFixed(6)}
                              </div>
                            )}
                          </div>
                        ) : (
                          "No location data"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {driver.is_active ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() =>
                            handleToggleDriverStatus(
                              driver.id,
                              driver.is_active
                            )
                          }
                          className={`mr-3 ${
                            driver.is_active
                              ? "text-red-600 hover:text-red-900"
                              : "text-green-600 hover:text-green-900"
                          }`}
                        >
                          {driver.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => router.push(`/drivers/${driver.id}`)}
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
      </div>

      {/* Create Driver Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Add New Driver
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

            <form onSubmit={handleCreateDriver} className="p-6 space-y-4">
              {/* Creation Result Display */}
              {creationResult && (
                <div
                  className={`p-4 rounded-md ${
                    creationResult.success
                      ? "bg-green-50 border border-green-200 text-green-800"
                      : "bg-red-50 border border-red-200 text-red-800"
                  }`}
                >
                  <p className="font-medium">{creationResult.message}</p>
                  {creationResult.success &&
                    creationResult.temporaryPassword && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">
                          Temporary Password:
                        </p>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {creationResult.temporaryPassword}
                        </code>
                        <p className="text-xs mt-1 text-gray-600">
                          Please share this with the driver securely. They
                          should change it on first login.
                        </p>
                      </div>
                    )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={newDriver.full_name}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, full_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={newDriver.email}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  disabled={isCreating}
                  placeholder="Optional (e.g., +1234567890)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={newDriver.phone}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  disabled={isCreating}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={newDriver.license_number}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, license_number: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Expiry
                </label>
                <input
                  type="date"
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  value={newDriver.license_expiry}
                  onChange={(e) =>
                    setNewDriver({ ...newDriver, license_expiry: e.target.value })
                  }
                />
              </div>

              {/* Password Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password Setup
                </label>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="passwordOption"
                      disabled={isCreating}
                      checked={newDriver.generatePassword}
                      onChange={() =>
                        setNewDriver({
                          ...newDriver,
                          generatePassword: true,
                          password: "",
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Generate secure password automatically (Recommended)
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="passwordOption"
                      disabled={isCreating}
                      checked={!newDriver.generatePassword}
                      onChange={() =>
                        setNewDriver({ ...newDriver, generatePassword: false })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm">Set custom password</span>
                  </label>
                </div>

                {!newDriver.generatePassword && (
                  <div className="mt-3">
                    <input
                      type="password"
                      required={!newDriver.generatePassword}
                      disabled={isCreating}
                      placeholder="Enter password (min 8 characters)"
                      minLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      value={newDriver.password}
                      onChange={(e) =>
                        setNewDriver({ ...newDriver, password: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreationResult(null);
                    setNewDriver({
                      full_name: "",
                      email: "",
                      phone: "",
                      license_number: "",
                      license_expiry: "",
                      password: "",
                      generatePassword: true,
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isCreating ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Creating Account...
                    </>
                  ) : (
                    "Create Driver Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

