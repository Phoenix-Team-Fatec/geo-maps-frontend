import MapScreen from '@/components/map/map-screen';
import { subscribe } from '@/src/services/propertiesStore';
import React, { useEffect, useState } from 'react';

export default function MapTab() {
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    const unsub = subscribe((items) => setMarkers(items));
    return unsub;
  }, []);

  return <MapScreen markers={markers} />;
}