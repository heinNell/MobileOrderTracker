"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // Check if we're on a public tracking page
  const isPublicTracking = pathname?.includes("/tracking/") && pathname?.includes("/public");

  // If it's a public tracking page, render without sidebar
  if (isPublicTracking) {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  // Otherwise, render with sidebar
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r">
          <div className="flex items-center justify-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-blue-600">
              Mobile Order Tracker
            </h1>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              <a
                href="/"
                className="bg-blue-50 text-blue-700 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Dashboard</span>
              </a>
              <a
                href="/orders"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Orders</span>
              </a>
              <a
                href="/tracking"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Live Tracking</span>
              </a>
              <a
                href="/incidents"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Incidents</span>
              </a>
              <a
                href="/messages"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Messages</span>
              </a>
              <a
                href="/drivers"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Drivers</span>
              </a>
              <a
                href="/analytics"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Analytics</span>
              </a>
              <a
                href="/geofences"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Geofences</span>
              </a>
              
              {/* Pre-Configuration Section */}
              <div className="pt-4 pb-2">
                <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pre-Configuration
                </p>
              </div>
              <a
                href="/templates"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Templates</span>
              </a>
              <a
                href="/transporters"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Transporters</span>
              </a>
              <a
                href="/contacts"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Contacts</span>
              </a>
              
              {/* System Section */}
              <div className="pt-4 pb-2">
                <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  System
                </p>
              </div>
              <a
                href="/diagnostics"
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
              >
                <span className="ml-3">Diagnostics</span>
              </a>
            </nav>
          </div>
        </div>
      </div>

      {/* Main content with sidebar offset */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
