"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface StatusUpdate {
  id: string;
  status: string;
  note: string;
  created_at: string;
  driver_name: string;
  created_by_name: string;
}

interface StatusHistoryProps {
  orderId: string;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-100 text-blue-800",
  activated: "bg-purple-100 text-purple-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  in_transit: "bg-orange-100 text-orange-800",
  arrived: "bg-green-100 text-green-800",
  loading: "bg-indigo-100 text-indigo-800",
  loaded: "bg-teal-100 text-teal-800",
  unloading: "bg-red-100 text-red-800",
  delivered: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Assignment",
  assigned: "Assigned to Driver", 
  activated: "Load Activated",
  in_progress: "Trip Started",
  in_transit: "In Transit",
  arrived: "Arrived at Location",
  loading: "Loading Cargo",
  loaded: "Cargo Loaded",
  unloading: "Unloading Cargo",
  delivered: "Delivered",
  completed: "Order Completed",
  cancelled: "Cancelled"
};

export default function StatusHistory({ orderId, className = "" }: StatusHistoryProps) {
  const [statusHistory, setStatusHistory] = useState<StatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStatusHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .rpc('get_order_status_history', {
            p_order_id: orderId
          });

        if (fetchError) {
          throw fetchError;
        }

        if (mounted) {
          setStatusHistory(data || []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load status history');
          console.error('Status history error:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (orderId) {
      fetchStatusHistory();
    }

    return () => {
      mounted = false;
    };
  }, [orderId]);

  // Set up real-time subscription for status updates
  useEffect(() => {
    if (!orderId) return;

    const subscription = supabase
      .channel(`status_updates_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'status_updates',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('Status update received:', payload);
          // Refetch history when new status update is added
          setStatusHistory(prev => {
            // If it's an insert, add to beginning of array
            if (payload.eventType === 'INSERT') {
              const newUpdate = payload.new as any;
              return [
                {
                  id: newUpdate.id,
                  status: newUpdate.status,
                  note: newUpdate.note || '',
                  created_at: newUpdate.created_at,
                  driver_name: '',
                  created_by_name: ''
                },
                ...prev
              ];
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
          Error loading status history: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
      
      {statusHistory.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-4">
          No status updates recorded yet
        </div>
      ) : (
        <div className="space-y-4">
          {statusHistory.map((update, index) => (
            <div key={update.id} className="relative">
              {/* Timeline line */}
              {index < statusHistory.length - 1 && (
                <div className="absolute left-4 top-8 w-px h-6 bg-gray-200"></div>
              )}
              
              <div className="flex items-start space-x-3">
                {/* Status indicator */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
                  ${STATUS_COLORS[update.status] || 'bg-gray-100 text-gray-800'}
                `}>
                  {index + 1}
                </div>
                
                {/* Status details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      {STATUS_LABELS[update.status] || update.status}
                    </h4>
                    <time className="text-xs text-gray-500">
                      {new Date(update.created_at).toLocaleString()}
                    </time>
                  </div>
                  
                  {update.note && (
                    <p className="text-sm text-gray-600 mt-1">
                      {update.note}
                    </p>
                  )}
                  
                  {update.driver_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Updated by: {update.driver_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Real-time indicator */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
          Real-time status updates enabled
        </div>
      </div>
    </div>
  );
}