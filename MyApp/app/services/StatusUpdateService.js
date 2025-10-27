// StatusUpdateService.js
// Comprehensive status update service for Mobile Order Tracker

import { Alert } from 'react-native';

import { supabase } from '../lib/supabase';

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

// Status transition rules - Forward-only workflow (no backwards transitions)
export const STATUS_TRANSITIONS = {
  [ORDER_STATUSES.PENDING]: [ORDER_STATUSES.ASSIGNED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ASSIGNED]: [ORDER_STATUSES.ACTIVATED, ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ACTIVATED]: [ORDER_STATUSES.IN_PROGRESS, ORDER_STATUSES.ARRIVED_AT_LOADING_POINT, ORDER_STATUSES.LOADING, ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.IN_PROGRESS]: [ORDER_STATUSES.ARRIVED_AT_LOADING_POINT, ORDER_STATUSES.LOADING, ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.IN_TRANSIT]: [ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT, ORDER_STATUSES.UNLOADING, ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ARRIVED]: [ORDER_STATUSES.LOADING, ORDER_STATUSES.LOADED, ORDER_STATUSES.UNLOADING, ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ARRIVED_AT_LOADING_POINT]: [ORDER_STATUSES.LOADING, ORDER_STATUSES.LOADED, ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.LOADING]: [ORDER_STATUSES.LOADED, ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.LOADED]: [ORDER_STATUSES.IN_TRANSIT, ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT, ORDER_STATUSES.UNLOADING, ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED],
  [ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT]: [ORDER_STATUSES.UNLOADING, ORDER_STATUSES.DELIVERED, ORDER_STATUSES.CANCELLED],
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

  // Get available status transitions for current status (static method)
  static getAvailableTransitions(currentStatus) {
    return STATUS_TRANSITIONS[currentStatus] || [];
  }

  // Validate if status transition is allowed (static method)
  static isValidTransition(fromStatus, toStatus) {
    const availableTransitions = StatusUpdateService.getAvailableTransitions(fromStatus);
    return availableTransitions.includes(toStatus);
  }

  // Update order status with comprehensive logging
  async updateOrderStatus(orderId, newStatus, note = null, skipValidation = false) {
    try {
      console.log('🔄 Status Update Request:', {
        orderId,
        newStatus,
        note: note?.substring(0, 50),
        skipValidation
      });

      // Get current user if not already set
      if (!this.currentUser) {
        console.log('📱 Fetching current user...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('❌ User not authenticated');
          throw new Error('User not authenticated');
        }
        this.currentUser = user;
        console.log('✅ User authenticated:', user.id);
      }

      // Get current order status
      console.log('📦 Fetching order data...');
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('status, assigned_driver_id')
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('❌ Failed to fetch order:', orderError);
        throw new Error(`Failed to fetch order: ${orderError.message}`);
      }

      console.log('📦 Order data:', {
        currentStatus: orderData.status,
        assignedDriverId: orderData.assigned_driver_id,
        currentUserId: this.currentUser.id
      });

      // Validate transition unless skipped
      if (!skipValidation && !StatusUpdateService.isValidTransition(orderData.status, newStatus)) {
        console.error('❌ Invalid transition:', {
          from: orderData.status,
          to: newStatus,
          allowed: STATUS_TRANSITIONS[orderData.status]
        });
        throw new Error(`Invalid status transition from ${orderData.status} to ${newStatus}`);
      }

      // Verify driver permission
      if (orderData.assigned_driver_id !== this.currentUser.id) {
        console.error('❌ Driver not authorized:', {
          orderId,
          assignedDriverId: orderData.assigned_driver_id,
          currentUserId: this.currentUser.id
        });
        throw new Error('Driver not authorized to update this order');
      }

      // Update order status directly and create status history record
      console.log('💾 Updating order status in database...');
      const { data: updateResult, error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select('*')
        .single();

      if (updateError) {
        console.error('❌ Order update failed:', updateError);
        throw new Error(`Status update failed: ${updateError.message}`);
      }

      console.log('✅ Order status updated successfully');

      // Create status history record for dashboard synchronization
      const statusHistoryData = {
        order_id: orderId,
        previous_status: orderData.status,
        new_status: newStatus,
        changed_by: this.currentUser.id,
        changed_at: new Date().toISOString(),
        notes: note || `Status updated to ${STATUS_INFO[newStatus]?.label || newStatus}`,
        driver_location: null, // Will be updated by location service if available
        metadata: {
          updated_via: 'mobile_app',
          user_agent: 'StatusUpdateService',
          timestamp: new Date().toISOString()
        }
      };

      // Try to insert into order_status_history table (dashboard compatibility)
      console.log('💾 Creating status history record...');
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert(statusHistoryData);

      if (historyError) {
        console.warn('⚠️ Failed to create status history record:', historyError.message);
        console.warn('⚠️ History data attempted:', statusHistoryData);
        // Don't fail the status update if history insert fails
      } else {
        console.log('✅ Status history record created');
      }

      // Also try to insert into status_updates table if it exists (dashboard compatibility)
      // IMPORTANT: status_updates table uses different column names:
      // - 'status' instead of 'new_status'
      // - 'user_id' and 'driver_id' instead of 'updated_by'
      console.log('💾 Creating status update record...');
      const statusUpdateData = {
        order_id: orderId,
        driver_id: this.currentUser.id,  // Foreign key to users table
        status: newStatus,                // The new status value
        notes: note || `Status updated to ${STATUS_INFO[newStatus]?.label || newStatus}`
        // created_at is auto-generated by database DEFAULT NOW()
      };

      console.log('💾 Inserting status update:', statusUpdateData);

      const { error: statusUpdatesError } = await supabase
        .from('status_updates')
        .insert(statusUpdateData);

      if (statusUpdatesError) {
        console.error('❌ Failed to create status update record:', statusUpdatesError);
        console.error('❌ Status update data attempted:', statusUpdateData);
        // Don't fail the status update if status_updates insert fails
      } else {
        console.log('✅ Status update record created successfully');
      }

      console.log('🎉 Status update completed successfully!');
      return {
        success: true,
        order: updateResult,
        oldStatus: orderData.status,
        newStatus: newStatus,
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
  static showStatusUpdateConfirmation(currentStatus, newStatus, onConfirm) {
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

// Export both the class and a singleton instance
const statusUpdateServiceInstance = new StatusUpdateService();

export { StatusUpdateService };
export default statusUpdateServiceInstance;
