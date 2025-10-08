/**
 * Handles API errors in a consistent way
 * @param error The error object
 * @param context Additional context about where the error occurred
 */
export const handleApiError = (error: unknown, context: string = "API Error"): void => {
  console.error(`${context}:`, error);
  
  // You can add additional error handling here:
  // - Send to error monitoring service
  // - Display toast notification
  // - Log to analytics
};

/**
 * Handles successful API responses
 * @param message Success message to display
 * @param data Optional data from the response
 */
export const handleSuccess = (message: string, data?: any): void => {
  console.log(`Success: ${message}`, data);
  
  // You can add additional success handling here:
  // - Display toast notification
  // - Update UI state
  // - Log to analytics
};

/**
 * Formats error messages for display
 * @param error Error object or string
 */
export const formatErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
};

/**
 * Checks if an error is a network error
 * @param error Error to check
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('network') || 
      error.message.includes('Network') ||
      error.message.includes('Failed to fetch')
    );
  }
  return false;
};
