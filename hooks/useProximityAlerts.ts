import { useState, useEffect, useRef } from 'react';
import { Occurrence, fetchActiveOccurrences } from '@/services/occurrence-client';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface ProximityAlert {
  occurrence: Occurrence;
  distance: number;
  shown: boolean;
}

interface UseProximityAlertsOptions {
  currentLocation: LocationCoords | null;
  alertRadius?: number; // meters (default: 500m)
  enabled?: boolean;
  refreshInterval?: number; // milliseconds (default: 30 seconds)
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(coord1: LocationCoords, coord2: LocationCoords): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Hook to detect and manage proximity alerts for occurrences
 * Similar to Waze's alert system
 */
export function useProximityAlerts({
  currentLocation,
  alertRadius = 500, // 500 meters default
  enabled = true,
  refreshInterval = 30000, // 30 seconds
}: UseProximityAlertsOptions) {
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [nearbyOccurrences, setNearbyOccurrences] = useState<ProximityAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<ProximityAlert | null>(null);
  const shownAlertsRef = useRef<Set<string>>(new Set());
  const lastLocationRef = useRef<LocationCoords | null>(null);

  // Fetch occurrences from backend
  useEffect(() => {
    if (!enabled) return;

    const loadOccurrences = async () => {
      const data = await fetchActiveOccurrences();
      setOccurrences(data);
    };

    loadOccurrences();
    const interval = setInterval(loadOccurrences, refreshInterval);

    return () => clearInterval(interval);
  }, [enabled, refreshInterval]);

  // Check proximity when location or occurrences change
  useEffect(() => {
    if (!enabled || !currentLocation || occurrences.length === 0) {
      setNearbyOccurrences([]);
      setActiveAlert(null);
      return;
    }

    // Calculate distance to all occurrences
    const nearby = occurrences
      .map((occ) => {
        const distance = calculateDistance(currentLocation, {
          latitude: occ.coordinate.latitude,
          longitude: occ.coordinate.longitude,
        });

        const occId = occ._id || `${occ.coordinate.latitude}-${occ.coordinate.longitude}`;
        const shown = shownAlertsRef.current.has(occId);

        return {
          occurrence: occ,
          distance,
          shown,
        };
      })
      .filter((alert) => alert.distance <= alertRadius)
      .sort((a, b) => a.distance - b.distance); // Sort by closest first

    setNearbyOccurrences(nearby);

    // Show alert for the closest occurrence that hasn't been shown yet
    const newAlert = nearby.find((alert) => !alert.shown);
    if (newAlert) {
      const occId = newAlert.occurrence._id ||
        `${newAlert.occurrence.coordinate.latitude}-${newAlert.occurrence.coordinate.longitude}`;

      // Mark as shown
      shownAlertsRef.current.add(occId);
      setActiveAlert(newAlert);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setActiveAlert((current) =>
          current?.occurrence._id === newAlert.occurrence._id ? null : current
        );
      }, 10000);
    }

    // Clear shown alerts if user has moved significantly (> 1km)
    if (lastLocationRef.current) {
      const movedDistance = calculateDistance(lastLocationRef.current, currentLocation);
      if (movedDistance > 1000) {
        shownAlertsRef.current.clear();
      }
    }
    lastLocationRef.current = currentLocation;
  }, [currentLocation, occurrences, enabled, alertRadius]);

  const dismissAlert = () => {
    setActiveAlert(null);
  };

  const resetShownAlerts = () => {
    shownAlertsRef.current.clear();
  };

  return {
    occurrences,
    nearbyOccurrences,
    activeAlert,
    dismissAlert,
    resetShownAlerts,
  };
}
