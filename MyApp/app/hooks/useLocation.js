import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { startBackgroundLocation, stopBackgroundLocation } from '../services/BackgroundLocationTask';
import webLocationServiceInstance from '../services/WebLocationService';

const isWeb = typeof window !== 'undefined' && 'geolocation' in navigator;
const isExpo = typeof Location !== 'undefined';

const useLocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    trackingInterval = 30000, // 30 seconds default interval
    distanceFilter = 10, // 10 meters default distance filter
  } = options;

  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const serviceRef = useRef(webLocationServiceInstance);
  const trackingRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const clearError = () => setError(null);

  const requestPermission = async () => {
    setError(null);
    if (isExpo) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return false;
      }
      return true;
    }
    return true;
  };

  const startTracking = async (newOrderId) => {
    setError(null);
    setLoading(true);
    setOrderId(newOrderId);

    if (isExpo) {
      const fg = await requestPermission();
      if (!fg) {
        setLoading(false);
        return false;
      }

      try {
        // Stop any existing tracking
        if (trackingRef.current) {
          await stopTracking();
        }

        // Start background tracking
        const bg = await startBackgroundLocation(newOrderId);
        if (!bg) {
          setLoading(false);
          return false;
        }

        // Start foreground tracking with interval and distance filter
        trackingRef.current = await Location.watchPositionAsync(
          {
            accuracy: enableHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
            timeInterval: trackingInterval,
            distanceInterval: distanceFilter,
          },
          (location) => {
            if (!mountedRef.current) return;
            
            const formattedLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy || 0,
              speed: location.coords.speed ?? null,
              heading: location.coords.heading ?? null,
              timestamp: new Date(location.timestamp).toISOString()
            };
            
            setLocation(formattedLocation);
          }
        );

        setIsTracking(true);
      } catch (error) {
        console.error('Location tracking error:', error);
        setError('Failed to start tracking');
      }
    }

    if (isWeb) {
      const success = await serviceRef.current.startTracking(newOrderId);
      setIsTracking(success);
    }

    setLoading(false);
    return true;
  };

  const stopTracking = async () => {
    if (isExpo) {
      if (trackingRef.current) {
        trackingRef.current.remove();
        trackingRef.current = null;
      }
      await stopBackgroundLocation();
    }

    if (isWeb) {
      serviceRef.current.stopTracking();
    }

    setIsTracking(false);
    setOrderId(null);
    setLocation(null);
  };

  // Use useCallback to properly memoize handleAppStateChange with its dependencies
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App has come to the foreground!');
      if (isTracking) {
        if (isExpo) {
          startBackgroundLocation(orderId);
        }
        if (isWeb) {
          serviceRef.current.resumeTracking();
        }
      }
    } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
      console.log('App has gone to the background!');
      if (isTracking) {
        if (isExpo) {
          stopBackgroundLocation();
        }
        if (isWeb) {
          serviceRef.current.pauseTracking();
        }
      }
    }
    appStateRef.current = nextAppState;
  }, [isTracking, orderId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopTracking();
    };
  }, []);

  return {
    location,
    isTracking,
    orderId,
    error,
    loading,
    startTracking,
    stopTracking,
    requestPermission,
    clearError
  };
};

export default useLocation;
