// Incidents Page - Incident Management Interface
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Incident, Order } from "../../../shared/types";
import { useRouter } from "next/navigation";
import { parsePostGISPoint } from "../../../shared/locationUtils";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "severity">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const incidentsPerPage = 10;
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterAndSortIncidents();
  }, [incidents, searchTerm, severityFilter, statusFilter, sortBy, sortOrder, currentPage]);

  const checkAuth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);
    fetchIncidents();
    subscribeToIncidents();
  };

  const fetchIncidents = async (page = 1) => {
    try {
      setLoading(true);
      
      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from("incidents")
        .select("*", { count: "exact", head: true });
      
      if (countError) throw countError;
      
      if (count) {
        setTotalPages(Math.ceil(count / incidentsPerPage));
      }

      // Get incidents for current page
      const from = (page - 1) * incidentsPerPage;
      const to = from + incidentsPerPage - 1;

      const { data, error } = await supabase
        .from("incidents")
        .select(
          `
          *,
          order:orders!incidents_order_id_fkey(
            order_number,
            loading_point_name,
            unloading_point_name
          ),
          driver:users!incidents_driver_id_fkey(
            full_name,
            phone
          )
        `
        )
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(from, to);

      if (error) throw error;

      setIncidents(data || []);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToIncidents = () => {
    const channel = supabase
      .channel("incidents_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
        },
        () => {
          fetchIncidents(currentPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filterAndSortIncidents = () => {
    let result = [...incidents];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (incident) =>
          incident.title.toLowerCase().includes(term) ||
          incident.description.toLowerCase().includes(term) ||
          (incident.order?.order_number && incident.order.order_number.toLowerCase().includes(term)) ||
          (incident.driver?.full_name && incident.driver.full_name.toLowerCase().includes(term))
      );
    }

    // Apply severity filter
    if (severityFilter !== "all") {
      result = result.filter((incident) => incident.severity === severityFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((incident) => 
        statusFilter === "open" ? !incident.is_resolved : incident.is_resolved
      );
    }

    setFilteredIncidents(result);
  };

  const getIncidentSeverityColor = (severity: number): string => {
    const colors = [
      "bg-gray-200",
      "bg-blue-200",
      "bg-yellow-200",
      "bg-orange-200",
      "bg-red-200",
      "bg-red-500 text-white",
    ];
    return colors[severity - 1] || "bg-gray-200";
  };

  const getIncidentTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      delay: "bg-yellow-100 text-yellow-800",
      mechanical: "bg-red-100 text-red-800",
      traffic: "bg-blue-100 text-blue-800",
      weather: "bg-gray-100 text-gray-800",
      accident: "bg-purple-100 text-purple-800",
      other: "bg-green-100 text-green-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", incidentId);

      if (error) throw error;

      // Refresh incidents
      fetchIncidents(currentPage);
    } catch (error) {
      console.error("Error resolving incident:", error);
      alert("Failed to resolve incident");
    }
  };

  const handleSort = (field: "created_at" | "severity") => {
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
      fetchIncidents(page);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading incidents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="md:hidden bg-white shadow">
        <div className="px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Incidents</h1>
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Incident Management</h1>
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
            Manage and track reported incidents
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Incidents
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by title, description, order, or driver..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Severity
              </label>
              <select
                id="severity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
              >
                <option value="all">All Severities</option>
                <option value="1">1 - Low</option>
                <option value="2">2 - Medium</option>
                <option value="3">3 - High</option>
                <option value="4">4 - Critical</option>
                <option value="5">5 - Emergency</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Status
              </label>
              <select
                id="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "resolved")}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSeverityFilter("all");
                  setStatusFilter("all");
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center">
                      Reported
                      {sortBy === "created_at" && (
                        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th 
                    className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("severity")}
                  >
                    <div className="flex items-center">
                      Severity
                      {sortBy === "severity" && (
                        <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 md:px-6 py-4 text-center text-gray-500">
                      No incidents found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(incident.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {incident.order?.order_number || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {incident.order?.loading_point_name} → {incident.order?.unloading_point_name}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {incident.driver?.full_name || "Unknown"}
                        </div>
                        {incident.driver?.phone && (
                          <div className="text-xs text-gray-500">
                            {incident.driver.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-[150px] md:max-w-[200px] truncate">
                          {incident.title}
                        </div>
                        <div className="text-xs text-gray-500 max-w-[150px] md:max-w-[200px] truncate">
                          {incident.description}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getIncidentSeverityColor(
                            incident.severity
                          )}`}
                        >
                          {incident.severity}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${getIncidentTypeColor(
                            incident.incident_type
                          )}`}
                        >
                          {incident.incident_type}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        {incident.is_resolved ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Resolved
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!incident.is_resolved && (
                          <button
                            onClick={() => handleResolveIncident(incident.id)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/incidents/${incident.id}`)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 md:px-6 py-4 bg-gray-50 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing page <span className="font-medium">{currentPage}</span> of{" "}
                <span className="font-medium">{totalPages}</span>
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
    </div>
  );
}