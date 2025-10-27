// Enhanced Status Picker Component for Mobile Order Tracker
// Provides professional dropdown interface for status selection

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusUpdateService, ORDER_STATUSES, STATUS_INFO } from '../../services/StatusUpdateService';

const colors = {
  primary: "#2563eb",
  success: "#10b981",
  warning: "#f59e0b", 
  danger: "#ef4444",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray300: "#cbd5e1",
  gray500: "#64748b",
  gray600: "#475569",
  gray700: "#334155",
  gray900: "#0f172a",
  white: "#ffffff",
  green50: "#f0fdf4",
  green100: "#dcfce7",
  blue50: "#eff6ff",
  orange50: "#fff7ed",
  red50: "#fef2f2",
  black: "#000",
  shadowColor: "#000",
  modalOverlay: "rgba(0, 0, 0, 0.5)"
};

const EnhancedStatusPicker = ({ 
  currentStatus, 
  orderId, 
  onStatusUpdate, 
  disabled = false 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // FIX 1: Get only the statuses available for transition. 
  // This list will be used as the FlatList data source.
  const selectableTransitions = StatusUpdateService.getAvailableTransitions(currentStatus);

  // FIX 2: Removed redundant `selectedStatus` state.

  const getStatusColor = (status) => {
    const statusColors = {
      [ORDER_STATUSES.PENDING]: colors.gray500,
      [ORDER_STATUSES.ASSIGNED]: colors.primary,
      [ORDER_STATUSES.ACTIVATED]: colors.success,
      [ORDER_STATUSES.IN_PROGRESS]: colors.primary,
      [ORDER_STATUSES.IN_TRANSIT]: colors.primary,
      [ORDER_STATUSES.ARRIVED]: colors.success,
      [ORDER_STATUSES.ARRIVED_AT_LOADING_POINT]: colors.success,
      [ORDER_STATUSES.LOADING]: colors.warning,
      [ORDER_STATUSES.LOADED]: colors.success,
      [ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT]: colors.success,
      [ORDER_STATUSES.UNLOADING]: colors.warning,
      [ORDER_STATUSES.DELIVERED]: colors.success,
      [ORDER_STATUSES.COMPLETED]: colors.success,
      [ORDER_STATUSES.CANCELLED]: colors.danger,
    };
    return statusColors[status] || colors.gray500;
  };

  const getStatusBackgroundColor = (status) => {
    const backgroundColors = {
      [ORDER_STATUSES.PENDING]: colors.gray100,
      [ORDER_STATUSES.ASSIGNED]: colors.blue50,
      [ORDER_STATUSES.ACTIVATED]: colors.green50,
      [ORDER_STATUSES.IN_PROGRESS]: colors.blue50,
      [ORDER_STATUSES.IN_TRANSIT]: colors.blue50,
      [ORDER_STATUSES.ARRIVED]: colors.green50,
      [ORDER_STATUSES.ARRIVED_AT_LOADING_POINT]: colors.green50,
      [ORDER_STATUSES.LOADING]: colors.orange50,
      [ORDER_STATUSES.LOADED]: colors.green50,
      [ORDER_STATUSES.ARRIVED_AT_UNLOADING_POINT]: colors.green50,
      [ORDER_STATUSES.UNLOADING]: colors.orange50,
      [ORDER_STATUSES.DELIVERED]: colors.green50,
      [ORDER_STATUSES.COMPLETED]: colors.green50,
      [ORDER_STATUSES.CANCELLED]: colors.red50,
    };
    return backgroundColors[status] || colors.gray100;
  };

  const handleStatusSelection = async (newStatus) => {
    // This check is a safeguard, but with the list fixed, `newStatus` will never be `currentStatus`
    if (newStatus === currentStatus) {
      setModalVisible(false);
      return;
    }

    // Show confirmation for status change
    Alert.alert(
      'Update Order Status',
      `Change status from "${STATUS_INFO[currentStatus]?.label || currentStatus}" to "${STATUS_INFO[newStatus]?.label || newStatus}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setModalVisible(false)
        },
        {
          text: 'Update',
          style: 'default',
          onPress: () => performStatusUpdate(newStatus)
        }
      ]
    );
  };

  const performStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      setModalVisible(false);

      // FIX 3: Call method statically on the service object, not its prototype
      const result = await StatusUpdateService.updateOrderStatus(
        orderId, 
        newStatus, 
        `Status updated to ${STATUS_INFO[newStatus]?.label || newStatus}`
      );

      if (result.success) {
        // Removed setSelectedStatus(newStatus); 
        // The parent component must update the 'currentStatus' prop via onStatusUpdate
        onStatusUpdate && onStatusUpdate(newStatus, result);
        
        Alert.alert(
          'Status Updated',
          result.message || `Order status successfully updated to ${STATUS_INFO[newStatus]?.label || newStatus}.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      Alert.alert(
        'Update Failed',
        error.message || 'Failed to update order status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUpdating(false);
    }
  };

  const renderStatusOption = ({ item: status }) => {
    const statusInfo = STATUS_INFO[status];
    // Since 'status' is now guaranteed to be a selectable transition, 
    // we simplify the logic and remove the `isCurrentStatus` and `isAvailable` checks.
    
    return (
      <TouchableOpacity
        style={[
          styles.statusOption,
          { backgroundColor: getStatusBackgroundColor(status) },
          // Removed conditional styles for current/disabled
        ]}
        onPress={() => handleStatusSelection(status)}
        disabled={updating} // Disable options if an update is already pending
      >
        <View style={styles.statusOptionContent}>
          <View style={styles.statusIconContainer}>
            <MaterialIcons 
              name={statusInfo?.icon || 'radio-button-unchecked'} 
              size={24} 
              color={getStatusColor(status)} 
            />
          </View>
          
          <View style={styles.statusTextContainer}>
            <Text style={[
              styles.statusLabel,
              { color: getStatusColor(status) },
            ]}>
              {statusInfo?.label || status.replace(/_/g, ' ').toUpperCase()}
            </Text>
            
            {statusInfo?.description && (
              <Text style={styles.statusDescription}>
                {statusInfo.description}
              </Text>
            )}
          </View>

          {/* Removed indicators since all options are now valid transitions */}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          disabled && styles.disabledButton,
          updating && styles.updatingButton
        ]}
        onPress={() => !disabled && !updating && setModalVisible(true)}
        disabled={disabled || updating}
      >
        <View style={styles.pickerButtonContent}>
          <View style={styles.currentStatusDisplay}>
            <MaterialIcons 
              name={STATUS_INFO[currentStatus]?.icon || 'radio-button-unchecked'} 
              size={20} 
              color={getStatusColor(currentStatus)} 
            />
            <Text style={[
              styles.currentStatusText,
              { color: getStatusColor(currentStatus) }
            ]}>
              {STATUS_INFO[currentStatus]?.label || currentStatus.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>

          {updating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons 
              name={disabled ? "lock" : "expand-more"} 
              size={24} 
              color={disabled ? colors.gray300 : colors.gray600} 
            />
          )}
        </View>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Order Status</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            {/* UX IMPROVEMENT: Display Current Status */}
            <Text style={styles.modalSubtitle}>
              Current Status:
            </Text>
            <View style={styles.currentStatusModalDisplay}>
              <MaterialIcons 
                name={STATUS_INFO[currentStatus]?.icon || 'radio-button-unchecked'} 
                size={20} 
                color={getStatusColor(currentStatus)} 
              />
              <Text style={[
                styles.currentStatusModalValue,
                { color: getStatusColor(currentStatus), backgroundColor: getStatusBackgroundColor(currentStatus) }
              ]}>
                {STATUS_INFO[currentStatus]?.label || currentStatus.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>

            <Text style={[styles.modalSubtitle, styles.selectNextStatusText]}>
              Select the **next** status:
            </Text>

            <FlatList
              data={selectableTransitions} // FIXED: Using only the valid transitions
              renderItem={renderStatusOption}
              keyExtractor={(item) => item}
              style={styles.statusList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyListText}>
                  No further status transitions are currently available for this order.
                </Text>
              )}
            />

            <View style={styles.modalFooter}>
              <Text style={styles.footerNote}>
                Only valid status transitions are displayed above.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  
  // Picker button styles
  pickerButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  updatingButton: {
    backgroundColor: colors.blue50,
    borderColor: colors.primary,
  },
  
  pickerButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  currentStatusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  currentStatusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  
  closeButton: {
    padding: 4,
  },
  
  modalSubtitle: {
    fontSize: 14,
    color: colors.gray600,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '500',
  },

  selectNextStatusText: {
    marginTop: 0,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },

  // Current Status Display in Modal (UX Improvement)
  currentStatusModalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.gray50,
    borderColor: colors.gray200,
    borderWidth: 1,
  },
  currentStatusModalValue: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  
  // Status list styles
  statusList: {
    maxHeight: 400,
    paddingBottom: 8,
  },

  emptyListText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  
  statusOption: {
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  
  // Removed unnecessary styles: currentStatusOption, disabledStatusOption, disabledText, currentIndicator, unavailableIndicator
  
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  
  statusIconContainer: {
    marginRight: 12,
  },
  
  statusTextContainer: {
    flex: 1,
  },
  
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  statusDescription: {
    fontSize: 13,
    color: colors.gray600,
    lineHeight: 18,
  },
  
  // Modal footer
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  
  footerNote: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default EnhancedStatusPicker;