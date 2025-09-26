import MapScreen from '@/components/map/map-screen';
const MapScreenAny: any = MapScreen;
import { subscribe } from '@/src/services/propertiesStore';
import React, { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

export default function MapTab() {
  const [markers, setMarkers] = useState<any[]>([]);
  const mapRef = useRef<any>(null);
  const params = useLocalSearchParams();

  useEffect(() => {
    const unsub = subscribe((items) => setMarkers(items));
    return unsub;
  }, []);

  useEffect(() => {
    const lat = params.lat as string | undefined;
    const lng = params.lng as string | undefined;
    if (lat && lng && mapRef.current && mapRef.current.centerOn) {
      const la = parseFloat(lat);
      const lo = parseFloat(lng);
      if (!isNaN(la) && !isNaN(lo)) {
        // center after a short delay to let map mount
        setTimeout(() => {
          mapRef.current.centerOn({ latitude: la, longitude: lo });
        }, 300);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lat, params.lng]);

  return <MapScreenAny ref={mapRef as any} markers={markers} />;
}