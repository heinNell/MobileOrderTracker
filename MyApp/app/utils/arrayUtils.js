// Array utility functions to prevent forEach errors
// Place this in app/utils/arrayUtils.js

/**
 * Safely execute forEach on a value, ensuring it's an array
 * @param {any} value - Value that should be an array
 * @param {Function} callback - Function to execute for each element
 * @param {string} context - Context for debugging (optional)
 */
export const safeForEach = (value, callback, context = 'unknown') => {
  if (!value) {
    console.warn(`safeForEach: ${context} - value is null or undefined`);
    return;
  }

  if (!Array.isArray(value)) {
    console.warn(`safeForEach: ${context} - value is not an array:`, typeof value, value);
    return;
  }

  if (typeof callback !== 'function') {
    console.error(`safeForEach: ${context} - callback is not a function`);
    return;
  }

  try {
    value.forEach(callback);
  } catch (error) {
    console.error(`safeForEach: ${context} - error during iteration:`, error);
  }
};

/**
 * Safely execute map on a value, ensuring it's an array
 * @param {any} value - Value that should be an array
 * @param {Function} callback - Function to execute for each element
 * @param {string} context - Context for debugging (optional)
 * @returns {Array} - Mapped array or empty array if invalid
 */
export const safeMap = (value, callback, context = 'unknown') => {
  if (!value) {
    console.warn(`safeMap: ${context} - value is null or undefined`);
    return [];
  }

  if (!Array.isArray(value)) {
    console.warn(`safeMap: ${context} - value is not an array:`, typeof value, value);
    return [];
  }

  if (typeof callback !== 'function') {
    console.error(`safeMap: ${context} - callback is not a function`);
    return [];
  }

  try {
    return value.map(callback);
  } catch (error) {
    console.error(`safeMap: ${context} - error during mapping:`, error);
    return [];
  }
};

/**
 * Safely filter an array
 * @param {any} value - Value that should be an array
 * @param {Function} callback - Filter function
 * @param {string} context - Context for debugging (optional)
 * @returns {Array} - Filtered array or empty array if invalid
 */
export const safeFilter = (value, callback, context = 'unknown') => {
  if (!value) {
    console.warn(`safeFilter: ${context} - value is null or undefined`);
    return [];
  }

  if (!Array.isArray(value)) {
    console.warn(`safeFilter: ${context} - value is not an array:`, typeof value, value);
    return [];
  }

  if (typeof callback !== 'function') {
    console.error(`safeFilter: ${context} - callback is not a function`);
    return [];
  }

  try {
    return value.filter(callback);
  } catch (error) {
    console.error(`safeFilter: ${context} - error during filtering:`, error);
    return [];
  }
};

/**
 * Ensure a value is an array
 * @param {any} value - Value to check
 * @param {Array} defaultValue - Default value if not an array
 * @returns {Array} - The array or default value
 */
export const ensureArray = (value, defaultValue = []) => {
  if (Array.isArray(value)) {
    return value;
  }
  
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  // If it's a single value, wrap it in an array
  return [value];
};