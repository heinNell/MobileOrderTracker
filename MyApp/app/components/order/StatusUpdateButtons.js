// StatusUpdateButtons.js
// React Native component for order status update buttons

import { MaterialIcons } from "@expo/vector-icons";
import { useState } from 'react';
import
  {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
  } from 'react-native';
import statusUpdateServiceInstance, { ORDER_STATUSES, STATUS_INFO, StatusUpdateService } from '../../services/StatusUpdateService';

// Color constants to avoid ESLint warnings
const colors = {
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  blue: {
    50: '#EFF6FF',
    500: '#3B82F6',
    600: '#2563EB'
  },
  red: {
    50: '#FEF2F2',
    500: '#EF4444'
  },
  yellow: {
    500: '#F59E0B'
  },
  green: {
    500: '#10B981'
  },
  emerald: {
    600: '#059669'
  }
};

const StatusUpdateButtons = ({ 
  order, 
  onStatusUpdate, 
  style,
  disabled = false,
  showAllTransitions = false 
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Get available status transitions
  const availableTransitions = showAllTransitions 
    ? Object.keys(ORDER_STATUSES).map(key => ORDER_STATUSES[key])
    : StatusUpdateService.getAvailableTransitions(order?.status);

  console.log('🔄 StatusUpdateButtons render:', {
    orderExists: !!order,
    orderId: order?.id,
    currentStatus: order?.status,
    showAllTransitions,
    availableTransitions,
    filteredCount: 'calculating...'
  });

  // Filter out current status and restrict admin-only operations
  const filteredTransitions = availableTransitions.filter(status => {
    // Always exclude current status
    if (status === order?.status) return false;
    
    // If not showing all transitions (normal user mode), filter appropriately
    if (!showAllTransitions) {
      // Allow completed only if current status is delivered
      if (status === ORDER_STATUSES.COMPLETED && order?.status !== ORDER_STATUSES.DELIVERED) {
        return false;
      }
    }
    
    return true;
  });

  // Handle status update
  const handleStatusUpdate = async (newStatus, note = null) => {
    console.log('🎯 Handling status update:', { orderId: order?.id, newStatus, note });
    setIsUpdating(true);
    
    try {
      if (!order || !order.id) {
        throw new Error('No order provided or order missing ID');
      }

      console.log('📞 Calling statusUpdateServiceInstance.updateOrderStatus...');
      const result = await statusUpdateServiceInstance.updateOrderStatus(
        order.id, 
        newStatus, 
        note
      );

      console.log('📊 Status update result:', result);

      if (result.success) {
        console.log('✅ Status updated successfully');
        Alert.alert(
          'Status Updated',
          result.message,
          [{ text: 'OK' }]
        );
        
        // Notify parent component
        if (onStatusUpdate) {
          console.log('📢 Notifying parent component of update');
          onStatusUpdate(result.order);
        }
      } else {
        console.error('❌ Status update failed:', result.message);
        Alert.alert(
          'Update Failed',
          result.message || 'Failed to update order status',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error in handleStatusUpdate:', error);
      Alert.alert(
        'Error',
        `Failed to update status: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle status button press
  const handleStatusPress = (newStatus) => {
    console.log('👆 Button pressed for status:', newStatus);
    console.log('📦 Current order:', order?.id, 'Status:', order?.status);
    
    // For certain status updates, show note input
    if (newStatus === ORDER_STATUSES.CANCELLED || 
        newStatus === ORDER_STATUSES.DELIVERED ||
        newStatus === ORDER_STATUSES.ARRIVED ||
        newStatus === ORDER_STATUSES.ARRIVED_AT_LOADING_POINT ||
        newStatus === ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT) {
      console.log('📝 Showing note modal for:', newStatus);
      setPendingStatus(newStatus);
      setNoteText('');
      setShowNoteModal(true);
    } else {
      console.log('⚠️ Showing confirmation dialog for:', newStatus);
      // Show confirmation dialog
      StatusUpdateService.showStatusUpdateConfirmation(
        order?.status,
        newStatus,
        () => {
          console.log('✅ Confirmation accepted, updating status');
          handleStatusUpdate(newStatus);
        }
      );
    }
  };

  // Handle note modal submit
  const handleNoteSubmit = () => {
    setShowNoteModal(false);
    handleStatusUpdate(pendingStatus, noteText.trim() || null);
    setPendingStatus(null);
    setNoteText('');
  };

  console.log('✨ Filtered transitions:', filteredTransitions);

  // Get button style based on status
  const getButtonStyle = (status) => {
    const statusInfo = STATUS_INFO[status];
    const isDestructive = status === ORDER_STATUSES.CANCELLED;
    const isPrimary = status === ORDER_STATUSES.IN_PROGRESS || 
                     status === ORDER_STATUSES.IN_TRANSIT ||
                     status === ORDER_STATUSES.DELIVERED ||
                     status === ORDER_STATUSES.COMPLETED;

    return [
      styles.statusButton,
      isDestructive && styles.destructiveButton,
      isPrimary && styles.primaryButton,
      { borderColor: statusInfo?.color || colors.gray[500] }
    ];
  };

  // Get button text color
  const getButtonTextColor = (status) => {
    const statusInfo = STATUS_INFO[status];
    return statusInfo?.color || colors.gray[500];
  };

  if (!order || filteredTransitions.length === 0) {
    return null;
  }

  return (
    <>
      <View style={[styles.container, style]}>
        <Text style={styles.sectionTitle}>Update Order Status</Text>
        
        <View style={styles.currentStatus}>
          <MaterialIcons 
            name={STATUS_INFO[order.status]?.icon || 'help'} 
            size={20} 
            color={STATUS_INFO[order.status]?.color || '#6B7280'} 
          />
          <Text style={styles.currentStatusText}>
            Current: {STATUS_INFO[order.status]?.label || order.status}
          </Text>
        </View>

        <View style={styles.buttonsContainer}>
          {filteredTransitions.map((status) => {
            const statusInfo = STATUS_INFO[status];
            return (
              <Pressable
                key={status}
                style={getButtonStyle(status)}
                onPress={() => handleStatusPress(status)}
                disabled={disabled || isUpdating}
              >
                <MaterialIcons 
                  name={statusInfo?.icon || 'update'} 
                  size={18} 
                  color={getButtonTextColor(status)} 
                />
                <Text style={[
                  styles.buttonText,
                  { color: getButtonTextColor(status) }
                ]}>
                  {statusInfo?.label || status}
                </Text>
                
                {isUpdating && (
                  <ActivityIndicator 
                    size="small" 
                    color={getButtonTextColor(status)} 
                  />
                )}
              </Pressable>
            );
          })}
        </View>

      </View>

      {/* Note input modal */}
      <Modal
        visible={showNoteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add Note for {STATUS_INFO[pendingStatus]?.label || pendingStatus}
            </Text>
            
            <TextInput
              style={styles.noteInput}
              placeholder={
                pendingStatus === ORDER_STATUSES.CANCELLED ? "Reason for cancellation" :
                pendingStatus === ORDER_STATUSES.DELIVERED ? "Delivery notes (customer signature, etc.)" :
                pendingStatus === ORDER_STATUSES.ARRIVED ? "Arrival location/notes" :
                pendingStatus === ORDER_STATUSES.ARRIVED_AT_LOADING_POINT ? "Loading point arrival notes" :
                pendingStatus === ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT ? "Unloading point arrival notes" :
                "Additional notes (optional)"
              }
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNoteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleNoteSubmit}
              >
                <Text style={styles.confirmButtonText}>Update Status</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 12,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
    marginLeft: 8,
  },
  buttonsContainer: {
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: colors.white,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: colors.blue[50],
  },
  destructiveButton: {
    backgroundColor: colors.red[50],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.gray[800],
    marginBottom: 16,
    textAlign: 'center',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray[100],
  },
  confirmButton: {
    backgroundColor: colors.blue[500],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[500],
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default StatusUpdateButtons;
