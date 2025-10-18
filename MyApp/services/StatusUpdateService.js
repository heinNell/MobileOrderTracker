// StatusUpdateService.js
// Comprehensive status update service for Mobile Order Tracker

import { Alert } from 'react-native';
import { supabase } from '../app/lib/supabase';

// Order status definitions matching database enum
export const ORDER_STATUSES = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  ACTIVATED: 'activated',
  IN_PROGRESS: 'in_progress',
  IN_TRANSIT: 'in_transit',
  ARRIVED: 'arrived',
  ARRIVED_AT_LOADING_POINT: 'arrived_at_loading_point',
  LOADING: 'loading',
  LOADED: 'loaded',
  ARRIVED_AT_UNLOADING_POINT: 'arrived_at_unloading_point',
  UNLOADING: 'unloading',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Status transition rules
export const STATUS_TRANSITIONS = {
  [ORDER_STATUSES.PENDING]: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ASSIGNED]: [ORDER_STATUSES.ACTIVATED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ACTIVATED]: [ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.ARRIVED_AT_LOADING_POINT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.IN_PROGRESS]: [ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.ARRIVED_AT_LOADING_POINT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.IN_TRANSIT]: [ORDER_STATUSES.ARRIVED_AT_LOADING_POINT, ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT, ORDER_STATUSES.ARRIVED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ARRIVED]: [ORDER_STATUSES.LOADING, ORDER_STATUSES.UNLOADING, ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ARRIVED_AT_LOADING_POINT]: [ORDER_STATUSES.LOADING, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.LOADING]: [ORDER_STATUSES.LOADED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.LOADED]: [ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT]: [ORDER_STATUSES.UNLOADING, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.UNLOADING]: [ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.DELIVERED]: [ORDER_STATUSES.COMPLETED],
  [ORDER_STATUSES.COMPLETED]: [], // Final state
  [ORDER_STATUSES.CANCELLED]: [] // Final state
};

// Status display information
export const STATUS_INFO = {
  [ORDER_STATUSES.PENDING]: {
    label: 'Pending Assignment',
    color: '#6B7280',
    icon: 'schedule',
    description: 'Order awaiting driver assignment'
  },
  [ORDER_STATUSES.ASSIGNED]: {
    label: 'Assigned to Driver',
    color: '#3B82F6',
    icon: 'assignment',
    description: 'Order assigned, awaiting activation'
  },
  [ORDER_STATUSES.ACTIVATED]: {
    label: 'Load Activated',
    color: '#10B981',
    icon: 'check-circle',
    description: 'QR code scanned, ready to start'
  },
  [ORDER_STATUSES.IN_PROGRESS]: {
    label: 'Trip Started',
    color: '#F59E0B',
    icon: 'play-arrow',
    description: 'Driver has started the journey'
  },
  [ORDER_STATUSES.IN_TRANSIT]: {
    label: 'In Transit',
    color: '#F59E0B',
    icon: 'local-shipping',
    description: 'Vehicle is moving to destination'
  },
  [ORDER_STATUSES.ARRIVED]: {
    label: 'Arrived at Location',
    color: '#10B981',
    icon: 'location-on',
    description: 'Driver has arrived at pickup/delivery point'
  },
  [ORDER_STATUSES.ARRIVED_AT_LOADING_POINT]: {
    label: 'Arrived at Loading Point',
    color: '#10B981',
    icon: 'location-on',
    description: 'Driver has arrived at the loading location'
  },
  [ORDER_STATUSES.LOADING]: {
    label: 'Loading Cargo',
    color: '#059669',
    icon: 'publish',
    description: 'Loading goods onto vehicle'
  },
  [ORDER_STATUSES.LOADED]: {
    label: 'Cargo Loaded',
    color: '#059669',
    icon: 'done-all',
    description: 'All goods loaded successfully'
  },
  [ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT]: {
    label: 'Arrived at Unloading Point',
    color: '#10B981',
    icon: 'location-on',
    description: 'Driver has arrived at the unloading location'
  },
  [ORDER_STATUSES.UNLOADING]: {
    label: 'Unloading Cargo',
    color: '#DC2626',
    icon: 'get-app',
    description: 'Unloading goods at destination'
  },
  [ORDER_STATUSES.DELIVERED]: {
    label: 'Delivered',
    color: '#059669',
    icon: 'check-circle',
    description: 'Goods delivered to customer'
  },
  [ORDER_STATUSES.COMPLETED]: {
    label: 'Order Completed',
    color: '#059669',
    icon: 'done-all',
    description: 'Order fully completed'
  },
  [ORDER_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    color: '#DC2626',
    icon: 'cancel',
    description: 'Order has been cancelled'
  }
};

class StatusUpdateService {
  constructor() {
    this.currentUser = null;
  }

  // Initialize service with current user
  async initialize(user) {
    this.currentUser = user;
  }

  // Get available status transitions for current status
  getAvailableTransitions(currentStatus) {
    return STATUS_TRANSITIONS[currentStatus] || [];
  }

  // Validate if status transition is allowed
  isValidTransition(fromStatus, toStatus) {
    const availableTransitions = this.getAvailableTransitions(fromStatus);
    return availableTransitions.includes(toStatus);
  }

  // Update order status with comprehensive logging
  async updateOrderStatus(orderId, newStatus, note = null, skipValidation = false) {
    try {
      if (!this.currentUser) {
        throw new Error('User not authenticated');
      }

      // Get current order status
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('status, assigned_driver_id, driver_id')
        .eq('id', orderId)
        .single();

      if (orderError) {
        throw new Error(`Failed to fetch order: ${orderError.message}`);
      }

      // Validate transition unless skipped
      if (!skipValidation && !this.isValidTransition(orderData.status, newStatus)) {
        throw new Error(`Invalid status transition from ${orderData.status} to ${newStatus}`);
      }

      // Verify driver permission
      if (orderData.assigned_driver_id !== this.currentUser.id && 
          orderData.driver_id !== this.currentUser.id) {
        throw new Error('Driver not authorized to update this order');
      }

      // Use the database function for consistent updates
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_order_status', {
          p_order_id: orderId,
          p_new_status: newStatus,
          p_driver_id: this.currentUser.id,
          p_note: note || `Status updated to ${STATUS_INFO[newStatus]?.label || newStatus}`
        });

      if (updateError) {
        throw new Error(`Status update failed: ${updateError.message}`);
      }

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Status update failed');
      }

      return {
        success: true,
        order: updateResult.order,
        oldStatus: updateResult.old_status,
        newStatus: updateResult.new_status,
        message: `Order status updated to ${STATUS_INFO[newStatus]?.label || newStatus}`
      };

    } catch (error) {
      console.error('Status update error:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to update status: ${error.message}`
      };
    }
  }

  // Get order status history
  async getOrderStatusHistory(orderId) {
    try {
      const { data, error } = await supabase
        .rpc('get_order_status_history', {
          p_order_id: orderId
        });

      if (error) {
        throw new Error(`Failed to fetch status history: ${error.message}`);
      }

      return {
        success: true,
        history: data || []
      };

    } catch (error) {
      console.error('Status history error:', error);
      return {
        success: false,
        error: error.message,
        history: []
      };
    }
  }

  // Convenience methods for common status updates
  async markAsInProgress(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.IN_PROGRESS, note);
  }

  async markAsInTransit(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.IN_TRANSIT, note);
  }

  async markAsArrived(orderId, location = null, note = null) {
    const arrivalNote = location ? 
      `Arrived at ${location}${note ? ` - ${note}` : ''}` : 
      note || 'Arrived at location';
    return this.updateOrderStatus(orderId, ORDER_STATUSES.ARRIVED, arrivalNote);
  }

  async markAsArrivedAtLoadingPoint(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.ARRIVED_AT_LOADING_POINT, note || 'Arrived at loading point');
  }

  async markAsLoading(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.LOADING, note || 'Started loading cargo');
  }

  async markAsLoaded(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.LOADED, note || 'Cargo loading completed');
  }

  async markAsArrivedAtUnloadingPoint(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT, note || 'Arrived at unloading point');
  }

  async markAsUnloading(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.UNLOADING, note || 'Started unloading cargo');
  }

  async markAsDelivered(orderId, customerSignature = null, note = null) {
    const deliveryNote = customerSignature ? 
      `Delivered and signed by customer${note ? ` - ${note}` : ''}` : 
      note || 'Goods delivered to customer';
    return this.updateOrderStatus(orderId, ORDER_STATUSES.DELIVERED, deliveryNote);
  }

  async markAsCompleted(orderId, note = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.COMPLETED, note || 'Order completed successfully');
  }

  async markAsCancelled(orderId, reason = null) {
    return this.updateOrderStatus(orderId, ORDER_STATUSES.CANCELLED, reason || 'Order cancelled', true);
  }

  // Bulk status update with confirmation
  async bulkUpdateStatus(orderIds, newStatus, note = null) {
    try {
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const orderId of orderIds) {
        const result = await this.updateOrderStatus(orderId, newStatus, note);
        results.push({ orderId, result });
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      return {
        success: failureCount === 0,
        results,
        summary: {
          total: orderIds.length,
          successful: successCount,
          failed: failureCount
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  // Helper to show status update confirmation dialog
  showStatusUpdateConfirmation(currentStatus, newStatus, onConfirm) {
    const fromInfo = STATUS_INFO[currentStatus];
    const toInfo = STATUS_INFO[newStatus];
    
    Alert.alert(
      'Update Order Status',
      `Change status from "${fromInfo?.label || currentStatus}" to "${toInfo?.label || newStatus}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Update',
          style: 'default',
          onPress: onConfirm
        }
      ]
    );
  }
}

export default new StatusUpdateService();