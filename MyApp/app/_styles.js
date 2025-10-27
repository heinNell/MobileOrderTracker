// _styles.js
import { StyleSheet } from 'react-native';
import Colors from './_constants/Colors';

// Create a flat colors object for components that import { colors }
// This flattens the nested gray object so components can use colors.gray600 instead of Colors.gray[600]
const flatColors = {
  // Base colors
  primary: Colors.primary,
  secondary: Colors.secondary,
  success: Colors.success,
  danger: Colors.danger,
  warning: Colors.warning,
  info: Colors.info,
  background: Colors.background,
  surface: Colors.surface,
  text: Colors.text,
  textSecondary: Colors.textSecondary,
  textLight: Colors.textLight,
  border: Colors.border,
  borderLight: Colors.borderLight,
  
  // Flattened gray shades
  gray50: Colors.gray[50],
  gray100: Colors.gray[100],
  gray200: Colors.gray[200],
  gray300: Colors.gray[300],
  gray400: Colors.gray[400],
  gray500: Colors.gray[500],
  gray600: Colors.gray[600],
  gray700: Colors.gray[700],
  gray800: Colors.gray[800],
  gray900: Colors.gray[900],
  
  // Additional colors for EnhancedStatusPicker
  white: Colors.surface || "#ffffff",
  green50: "#f0fdf4",
  green100: "#dcfce7",
  blue50: "#eff6ff",
  orange50: "#fff7ed",
  red50: "#fef2f2",
  
  // Add transparent and overlay colors
  transparent: Colors.transparent || 'transparent',
  overlayDark: 'rgba(0, 0, 0, 0.5)',
};

const GlobalStyles = StyleSheet.create({
  // CONTAINER STYLES
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // CARD STYLES
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: Colors.gray[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    shadowColor: Colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },

  // TEXT STYLES
  heading1: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  
  heading2: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  
  bodyText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  
  bodyTextSecondary: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  
  captionText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },

  // BUTTON STYLES
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  
  secondaryButton: {
    backgroundColor: Colors.transparent || 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  
  dangerButton: {
    backgroundColor: Colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // INPUT STYLES
  inputContainer: {
    marginBottom: 16,
  },
  
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.surface,
    color: Colors.text,
    minHeight: 48,
  },
  
  textInputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  
  textInputError: {
    borderColor: Colors.danger,
  },

  // STATUS STYLES
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  
  statusPending: {
    backgroundColor: Colors.warning + '20',
  },
  
  statusConfirmed: {
    backgroundColor: Colors.info + '20',
  },
  
  statusInProgress: {
    backgroundColor: Colors.primary + '20',
  },
  
  statusCompleted: {
    backgroundColor: Colors.success + '20',
  },
  
  statusCancelled: {
    backgroundColor: Colors.danger + '20',
  },
  
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  statusTextPending: {
    color: Colors.warning,
  },
  
  statusTextConfirmed: {
    color: Colors.info,
  },
  
  statusTextInProgress: {
    color: Colors.primary,
  },
  
  statusTextCompleted: {
    color: Colors.success,
  },
  
  statusTextCancelled: {
    color: Colors.danger,
  },

  // LAYOUT STYLES
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  column: {
    flexDirection: 'column',
  },
  
  flex1: {
    flex: 1,
  },
  
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // SPACING STYLES
  marginTop8: { marginTop: 8 },
  marginTop16: { marginTop: 16 },
  marginTop24: { marginTop: 24 },
  marginBottom8: { marginBottom: 8 },
  marginBottom16: { marginBottom: 16 },
  marginBottom24: { marginBottom: 24 },
  paddingHorizontal16: { paddingHorizontal: 16 },
  paddingVertical8: { paddingVertical: 8 },
  paddingVertical16: { paddingVertical: 16 },

  // BORDER STYLES
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  roundedCorners: {
    borderRadius: 8,
  },

  // ORDER TRACKER SPECIFIC STYLES
  orderHeader: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  
  orderDate: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  
  orderTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  orderItemName: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  
  orderItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },

  // LOADING STYLES
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },

  // ERROR STYLES
  errorContainer: {
    backgroundColor: Colors.danger + '10',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  
  errorText: {
    color: Colors.danger,
    fontSize: 14,
  },

  // SUCCESS STYLES
  successContainer: {
    backgroundColor: Colors.success + '10',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  
  successLabel: {
    color: Colors.success,
    fontSize: 14,
  },

  // ENHANCED STATUS PICKER SPECIFIC STYLES
  pickerButton: {
    backgroundColor: flatColors.white,
    borderWidth: 2,
    borderColor: flatColors.gray200,
    borderRadius: 12,
    padding: 16,
    shadowColor: flatColors.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  disabledButton: {
    backgroundColor: flatColors.gray100,
    borderColor: flatColors.gray300,
  },
  
  updatingButton: {
    backgroundColor: flatColors.blue50,
    borderColor: flatColors.primary,
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
    backgroundColor: flatColors.overlayDark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  modalContent: {
    backgroundColor: flatColors.white,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: flatColors.gray900,
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
    borderBottomColor: flatColors.gray200,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: flatColors.gray900,
  },
  
  closeButton: {
    padding: 4,
  },
  
  modalSubtitle: {
    fontSize: 14,
    color: flatColors.gray600,
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
    borderTopColor: flatColors.gray200,
  },

  currentStatusModalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: flatColors.gray50,
    borderColor: flatColors.gray200,
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
  
  statusList: {
    maxHeight: 400,
    paddingBottom: 8,
  },

  emptyListText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
    color: flatColors.gray500,
    fontStyle: 'italic',
  },
  
  statusOption: {
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: flatColors.gray200,
  },
  
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
    color: flatColors.gray600,
    lineHeight: 18,
  },
  
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: flatColors.gray200,
  },
  
  footerNote: {
    fontSize: 12,
    color: flatColors.gray500,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// Export both GlobalStyles and Colors for convenience
export default GlobalStyles;
export const colors = flatColors;
