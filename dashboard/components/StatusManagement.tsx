"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Order {
  id: string;
  order_number: string;
  status: string;
  driver_name?: string;
  assigned_driver_id?: string;
}

interface StatusManagementProps {
  order: Order;
  onStatusUpdate?: (updatedOrder: Order) => void;
  className?: string;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pending Assignment', color: 'gray' },
  { value: 'assigned', label: 'Assigned to Driver', color: 'blue' },
  { value: 'activated', label: 'Load Activated', color: 'emerald' },
  { value: 'in_progress', label: 'Trip Started', color: 'yellow' },
  { value: 'in_transit', label: 'In Transit', color: 'orange' },
  { value: 'arrived', label: 'Arrived at Location', color: 'green' },
  { value: 'arrived_at_loading_point', label: 'Arrived at Loading Point', color: 'green' },
  { value: 'loading', label: 'Loading Cargo', color: 'indigo' },
  { value: 'loaded', label: 'Cargo Loaded', color: 'teal' },
  { value: 'arrived_at_unloading_point', label: 'Arrived at Unloading Point', color: 'green' },
  { value: 'unloading', label: 'Unloading Cargo', color: 'red' },
  { value: 'delivered', label: 'Delivered', color: 'emerald' },
  { value: 'completed', label: 'Order Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

const STATUS_COLORS: Record<string, string> = {
  gray: "bg-gray-100 text-gray-800 border-gray-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  green: "bg-green-100 text-green-800 border-green-300",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-300",
  teal: "bg-teal-100 text-teal-800 border-teal-300",
  red: "bg-red-100 text-red-800 border-red-300",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-300"
};

export default function StatusManagement({ 
  order, 
  onStatusUpdate, 
  className = "" 
}: StatusManagementProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [note, setNote] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleStatusUpdate = async () => {
    if (selectedStatus === order.status) {
      return; // No change needed
    }

    setIsUpdating(true);
    
    try {
      // Use the database function for consistent updates
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_order_status', {
          p_order_id: order.id,
          p_new_status: selectedStatus,
          p_driver_id: order.assigned_driver_id || null,
          p_note: note.trim() || `Status updated by admin to ${getStatusLabel(selectedStatus)}`
        });

      if (updateError) {
        throw updateError;
      }

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Status update failed');
      }

      // Notify parent component
      if (onStatusUpdate) {
        onStatusUpdate({
          ...order,
          status: selectedStatus
        });
      }

      setNote('');
      setShowConfirmation(false);
      
      // Show success message
      alert(`Order #${order.order_number} status updated to ${getStatusLabel(selectedStatus)}`);

    } catch (error: any) {
      console.error('Status update error:', error);
      alert(`Failed to update status: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    return ORDER_STATUSES.find(s => s.value === status)?.label || status;
  };

  const getStatusColor = (status: string) => {
    const statusConfig = ORDER_STATUSES.find(s => s.value === status);
    return STATUS_COLORS[statusConfig?.color || 'gray'];
  };

  const handleStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    if (newStatus !== order.status) {
      setShowConfirmation(true);
    } else {
      setShowConfirmation(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Manage Order Status
      </h3>
      
      {/* Current Status Display */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Current Status
        </label>
        <div className={`
          inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border
          ${getStatusColor(order.status)}
        `}>
          {getStatusLabel(order.status)}
        </div>
      </div>

      {/* Status Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Update Status To
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isUpdating}
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Note Input */}
      {showConfirmation && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Update Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Reason for changing to ${getStatusLabel(selectedStatus)}...`}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            maxLength={500}
            disabled={isUpdating}
          />
          <div className="text-xs text-gray-500 mt-1">
            {note.length}/500 characters
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showConfirmation && (
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setSelectedStatus(order.status);
              setShowConfirmation(false);
              setNote('');
            }}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isUpdating}
          >
            Cancel
          </button>
          
          <button
            onClick={handleStatusUpdate}
            disabled={isUpdating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </div>
            ) : (
              `Update to ${getStatusLabel(selectedStatus)}`
            )}
          </button>
        </div>
      )}

      {/* Status Flow Indicator */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Status Flow</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {ORDER_STATUSES.map((status, index) => {
            const isCurrent = status.value === order.status;
            const isSelected = status.value === selectedStatus;
            const isPast = ORDER_STATUSES.findIndex(s => s.value === order.status) > index;
            
            return (
              <div
                key={status.value}
                className={`
                  text-xs px-2 py-1 rounded text-center border
                  ${isCurrent ? getStatusColor(status.value) : ''}
                  ${isSelected && !isCurrent ? 'border-blue-500 bg-blue-50 text-blue-800' : ''}
                  ${isPast && !isCurrent && !isSelected ? 'bg-gray-100 text-gray-600 border-gray-200' : ''}
                  ${!isPast && !isCurrent && !isSelected ? 'bg-white text-gray-500 border-gray-200' : ''}
                `}
              >
                {status.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver Info */}
      {order.driver_name && (
        <div className="mt-4 text-sm text-gray-600">
          <strong>Assigned Driver:</strong> {order.driver_name}
        </div>
      )}
    </div>
  );
}