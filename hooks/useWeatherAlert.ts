import { useState, useCallback, useRef, useEffect } from 'react';
import {
  fetchWeather,
  getWeatherSeverity,
  getWeatherAlertMessage,
  WeatherData,
} from '@/services/weather-api';

interface WeatherAlertConfig {
  enabled?: boolean;
  throttleMinutes?: number; // How long to wait before showing same location again
  autoFetchOnMount?: boolean;
}

interface WeatherAlertState {
  weather: WeatherData | null;
  severity: 'safe' | 'warning' | 'danger';
  message: string | null;
  isLoading: boolean;
  error: string | null;
}

interface LocationKey {
  lat: number;
  lng: number;
  timestamp: number;
}

/**
 * Custom hook for managing weather alerts with smart throttling
 * Prevents alert spam by tracking shown locations and time delays
 *
 * @param config - Configuration for alert behavior
 * @returns Weather alert state and control functions
 */
export function useWeatherAlert(config: WeatherAlertConfig = {}) {
  const {
    enabled = true,
    throttleMinutes = 30, // Default: Don't show same location alert for 30 minutes
    autoFetchOnMount = false,
  } = config;

  const [alertState, setAlertState] = useState<WeatherAlertState>({
    weather: null,
    severity: 'safe',
    message: null,
    isLoading: false,
    error: null,
  });

  const [showAlert, setShowAlert] = useState(false);
  const shownLocationsRef = useRef<Map<string, LocationKey>>(new Map());
  const sessionStartRef = useRef<number>(Date.now());

  /**
   * Generate a location key for throttling (rounded to ~1km precision)
   */
  const getLocationKey = (lat: number, lng: number): string => {
    const roundedLat = Math.round(lat * 100) / 100; // ~1.1km precision
    const roundedLng = Math.round(lng * 100) / 100;
    return `${roundedLat},${roundedLng}`;
  };

  /**
   * Check if we should show alert for this location
   */
  const shouldShowAlert = useCallback((lat: number, lng: number): boolean => {
    if (!enabled) return false;

    const key = getLocationKey(lat, lng);
    const shown = shownLocationsRef.current.get(key);

    if (!shown) return true;

    // Check if throttle time has passed
    const minutesSinceShown = (Date.now() - shown.timestamp) / (1000 * 60);
    return minutesSinceShown >= throttleMinutes;
  }, [enabled, throttleMinutes]);

  /**
   * Mark location as shown
   */
  const markLocationShown = useCallback((lat: number, lng: number) => {
    const key = getLocationKey(lat, lng);
    shownLocationsRef.current.set(key, {
      lat,
      lng,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * Fetch weather and determine if alert should be shown
   */
  const checkWeatherAlert = useCallback(async (
    lat: number,
    lng: number,
    options?: { force?: boolean }
  ): Promise<boolean> => {
    if (!enabled && !options?.force) {
      return false;
    }

    // Check throttling (unless forced)
    if (!options?.force && !shouldShowAlert(lat, lng)) {
      console.log('[WeatherAlert] Location recently shown, skipping alert');
      return false;
    }

    setAlertState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const weather = await fetchWeather(lat, lng);
      const severity = getWeatherSeverity(weather);
      const message = getWeatherAlertMessage(weather);

      setAlertState({
        weather,
        severity,
        message,
        isLoading: false,
        error: null,
      });

      // Always show alert for all weather conditions (safe, warning, danger)
      setShowAlert(true);
      markLocationShown(lat, lng);
      return true;
    } catch (error: any) {
      console.error('[WeatherAlert] Error fetching weather:', error);
      setAlertState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao buscar clima',
      }));
      return false;
    }
  }, [enabled, shouldShowAlert, markLocationShown]);

  /**
   * Dismiss the current alert
   */
  const dismissAlert = useCallback(() => {
    setShowAlert(false);
  }, []);

  /**
   * Reset all shown locations (useful for testing or new session)
   */
  const resetThrottle = useCallback(() => {
    shownLocationsRef.current.clear();
    sessionStartRef.current = Date.now();
  }, []);

  /**
   * Clear current alert state
   */
  const clearAlert = useCallback(() => {
    setShowAlert(false);
    setAlertState({
      weather: null,
      severity: 'safe',
      message: null,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Get session statistics (useful for debugging)
   */
  const getSessionStats = useCallback(() => {
    const sessionMinutes = (Date.now() - sessionStartRef.current) / (1000 * 60);
    return {
      sessionDuration: Math.round(sessionMinutes),
      locationsShown: shownLocationsRef.current.size,
      shownLocations: Array.from(shownLocationsRef.current.values()),
    };
  }, []);

  // Auto-fetch on mount if configured (not recommended for most cases)
  useEffect(() => {
    if (autoFetchOnMount && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          checkWeatherAlert(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('[WeatherAlert] Auto-fetch location error:', error);
        }
      );
    }
  }, [autoFetchOnMount, checkWeatherAlert]);

  return {
    // State
    weather: alertState.weather,
    severity: alertState.severity,
    message: alertState.message,
    isLoading: alertState.isLoading,
    error: alertState.error,
    showAlert,

    // Actions
    checkWeatherAlert,
    dismissAlert,
    clearAlert,
    resetThrottle,

    // Utilities
    shouldShowAlert,
    getSessionStats,
  };
}
