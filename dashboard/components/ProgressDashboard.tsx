// Real-time Progress Dashboard Component
// Shows ETA, progress percentage, and route statistics

import React from "react";

interface RouteProgress {
  completedPath: google.maps.LatLngLiteral[];
  remainingPath: google.maps.LatLngLiteral[];
  currentPosition: google.maps.LatLngLiteral;
  progressPercentage: number;
  estimatedTimeRemaining: number; // in minutes
  totalDistance: number; // in kilometers
  completedDistance: number; // in kilometers
  averageSpeed: number; // in km/h
}

interface ProgressDashboardProps {
  progress: RouteProgress | null;
  orderNumber: string;
  driverName: string;
  status: string;
  startTime?: string;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  progress,
  orderNumber,
  driverName,
  status,
  startTime,
}) => {
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}min`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: "bg-gray-500",
      assigned: "bg-blue-500",
      activated: "bg-green-500",
      in_progress: "bg-indigo-500",
      in_transit: "bg-purple-500",
      arrived: "bg-green-500",
      loading: "bg-yellow-500",
      loaded: "bg-green-500",
      unloading: "bg-yellow-500",
      completed: "bg-emerald-600",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage < 25) return "bg-red-500";
    if (percentage < 50) return "bg-yellow-500";
    if (percentage < 75) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Order #{orderNumber}
          </h2>
          <p className="text-gray-600 mt-1">
            Driver: <span className="font-semibold">{driverName}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <span
            className={`px-4 py-2 rounded-full text-white text-sm font-bold shadow-md ${getStatusColor(status)}`}
          >
            {status.toUpperCase().replace("_", " ")}
          </span>
        </div>
      </div>

      {progress ? (
        <>
          {/* Main Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Route Progress</span>
              <span className="text-sm font-bold text-gray-900">
                {progress.progressPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${getProgressColor(progress.progressPercentage)}`}
                style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* ETA */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⏱️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Estimated Arrival</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {progress.estimatedTimeRemaining > 0 
                      ? formatTime(progress.estimatedTimeRemaining)
                      : "Arrived"
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Distance Completed */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📍</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Distance Traveled</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatDistance(progress.completedDistance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Distance Remaining */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🎯</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Distance Remaining</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatDistance(progress.totalDistance - progress.completedDistance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Average Speed */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🚀</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-600">Average Speed</p>
                  <p className="text-2xl font-bold text-amber-900">
                    {progress.averageSpeed > 0 
                      ? `${progress.averageSpeed.toFixed(1)} km/h`
                      : "Calculating..."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Total Route Distance:</span>
                <span className="ml-2 font-bold text-gray-900">
                  {formatDistance(progress.totalDistance)}
                </span>
              </div>
              {startTime && (
                <div>
                  <span className="font-medium text-gray-600">Trip Started:</span>
                  <span className="ml-2 font-bold text-gray-900">
                    {new Date(startTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-600">Last Update:</span>
                <span className="ml-2 font-bold text-gray-900">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* ETA Breakdown */}
          {progress.estimatedTimeRemaining > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-blue-500 text-xl mr-3">🧭</span>
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Estimated arrival time:
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {new Date(Date.now() + progress.estimatedTimeRemaining * 60 * 1000).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading route progress...</p>
        </div>
      )}
    </div>
  );
};

export default ProgressDashboard;