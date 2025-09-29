import MapScreen from '@/components/map/map-screen';
import ButtonAddPlusRN from '@/components/plus-button/button-add-plus';
import AddPropertiesModal from '@/components/properties/add-properties';
import ViewPropertiesModal from '@/components/properties/view-properties';
import { addProperty, removeProperty, subscribe } from '@/src/services/propertiesStore';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

export default function PropertiesScreen() {
  const mapRef = useRef<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(false);
  const [properties, setProperties] = useState<Array<any>>([]);
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | undefined>(undefined);
  const [allowClipboardPrompt, setAllowClipboardPrompt] = useState(false);
  const [showButton, setShowButton] = useState(false)

  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    // Do not open the add modal on simple tap. We'll allow the user to choose a point (selectedPoint)
    // and open the add modal only when they tap a marker.
    setPendingCoords(coords);
    setPendingAddress(undefined);
    setAllowClipboardPrompt(false);
  };

  const handleMapLongPress = (coords: { latitude: number; longitude: number }) => {
    // Long-press creates a draft pin (selected point) and prefetch address
    setPendingCoords(coords);
    setAllowClipboardPrompt(false);
    (async () => {
      try {
        const [loc] = await (await import('expo-location')).reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
        const formatted = [loc.name, loc.street, loc.city, loc.region, loc.country].filter(Boolean).join(', ');
        setPendingAddress(formatted || undefined);
      } catch {
        setPendingAddress(undefined);
      }
      // Keep the draft pin visible; do not open modal automatically. User should tap the pin to open the add modal.
    })();
  };

  const handleCreate = (item: any) => {

    addProperty(item);  
    if (mapRef.current && mapRef.current.centerOn) {
      mapRef.current.centerOn({ latitude: item.latitude, longitude: item.longitude });
    }
    setShowAdd(false);
    setPendingCoords(null);
    setPendingAddress(undefined);
  };

  const handleMarkerPress = (marker: { id?: string; name?: string; latitude: number; longitude: number; isDraft?: boolean }) => {
    // When a marker is pressed, open the add modal prefilled with that marker's coords
    setPendingCoords({ latitude: marker.latitude, longitude: marker.longitude });
    setPendingAddress(undefined);
    (async () => {
      try {
        const [loc] = await (await import('expo-location')).reverseGeocodeAsync({ latitude: marker.latitude, longitude: marker.longitude });
        const formatted = [loc.name, loc.street, loc.city, loc.region, loc.country].filter(Boolean).join(', ');
        setPendingAddress(formatted || undefined);
      } catch {
        setPendingAddress(undefined);
      }
      setAllowClipboardPrompt(false);
      setShowAdd(true);
    })();
  };

  const handleCenter = (coords: { latitude: number; longitude: number }) => {
    if (mapRef.current && mapRef.current.centerOn) {
      mapRef.current.centerOn(coords);
    }
    setShowList(false);
  };

  const handleDelete = (id: string) => {
    removeProperty(id);
  };

  useEffect(() => {
    const unsub = subscribe((items) => setProperties(items));
    return unsub;
  }, []);


  useEffect(() => {
    
    const timer = setTimeout(() => {
      setShowButton(true) 
    },5000)

    return () => clearTimeout(timer)
  },[])

  return (
    <View className='flex-1 bg-[#1a1a2e] p-4'>
      <StatusBar style="light" />
  <Text className='text-white text-xl font-semibold mt-8 mb-'>Propriedades</Text>

      <View className='flex-1'>
        <View className='flex-1 w-full rounded-xl overflow-hidden'>
          <MapScreen ref={mapRef} onMapPress={handleMapPress} onMapLongPress={handleMapLongPress} onMarkerPress={handleMarkerPress} markers={properties} selectedPoint={pendingCoords} />
        </View>
      </View>

      <Text className='text-white/60 mt-4 text-center'>📍Selecione a localização no mapa para abrir o cadastro</Text>

  {showButton && (
    <ButtonAddPlusRN onAdd={() => { setAllowClipboardPrompt(true); setShowAdd(true); }} onList={() => setShowList(true)} />
    )}

      <AddPropertiesModal
        visible={showAdd}
        onClose={() => { setShowAdd(false); setPendingCoords(null); setPendingAddress(undefined); setAllowClipboardPrompt(false); }}
        onCreated={(item) => { handleCreate(item); setAllowClipboardPrompt(false); }}
        initialLatitude={pendingCoords?.latitude}
        initialLongitude={pendingCoords?.longitude}
        initialAddress={pendingAddress}
        showClipboardPrompt={allowClipboardPrompt}
      />

  <ViewPropertiesModal visible={showList} onClose={() => setShowList(false)} properties={properties} onCenter={handleCenter} onDelete={handleDelete} />
    </View>
  );
}
