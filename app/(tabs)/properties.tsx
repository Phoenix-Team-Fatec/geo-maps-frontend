import MapScreen from '@/components/map/map-screen';
const MapScreenAny: any = MapScreen;
import ButtonAddPlusRN from '@/components/plus-button/button-add-plus';
import AddPropertiesModal from '@/components/properties/add-pluscode';
import ViewPropertiesModal from '@/components/properties/view-properties';
import { addProperty, removeProperty, subscribe } from '@/src/services/propertiesStore';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function PropertiesScreen() {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(false);
  const [properties, setProperties] = useState<Array<any>>([]);
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | undefined>(undefined);
  const [allowClipboardPrompt, setAllowClipboardPrompt] = useState(false);

  const handleMapPress = (coords: { latitude: number; longitude: number }) => {
    setPendingCoords(coords);
    setPendingAddress(undefined);
    setAllowClipboardPrompt(false);
    // Mostrar pin e notificar o usuário
    Alert.alert('Coordenadas Registradas');
  };

  const handleMapLongPress = (coords: { latitude: number; longitude: number }) => {
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
    })();
  };

  const handleCreate = (item: any) => {
    addProperty(item);
    // navigate to the map tab and let it center based on params
    // pass coords as params
    // using router like handleCenter
    // router.push({ pathname: '/(tabs)/map', params: { lat: String(item.latitude), lng: String(item.longitude) } });
    setShowAdd(false);
    setPendingCoords(null);
    setPendingAddress(undefined);
  };

  const handleMarkerPress = (marker: { id?: string; name?: string; latitude: number; longitude: number; isDraft?: boolean }) => {
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
    router.push({ pathname: '/(tabs)/map', params: { lat: String(coords.latitude), lng: String(coords.longitude) } });
    setShowList(false);
  };

  const handleDelete = (id: string) => {
    removeProperty(id);
  };

  useEffect(() => {
    const unsub = subscribe((items) => setProperties(items));
    return unsub;
  }, []);

  return (
    <View className='flex-1 bg-[#1a1a2e] p-4'>
      <StatusBar style="light" />
  <Text className='text-white text-xl font-semibold mt-8 mb-'>Propriedades</Text>

      <View className='flex-1'>
        <View className='flex-1 w-full rounded-xl overflow-hidden'>
          <MapScreenAny onMapPress={handleMapPress} onMapLongPress={handleMapLongPress} onMarkerPress={handleMarkerPress} markers={properties} selectedPoint={pendingCoords} />
        </View>
      </View>

      <Text className='text-white/60 mt-4 text-center'>📍Selecione a localização no mapa para abrir o cadastro</Text>

      {/* Se o usuário clicou no mapa, mostramos um botão para adicionar PlusCode */}
      {pendingCoords ? (
        <View className='items-center mt-4'>
          <TouchableOpacity
            onPress={() => { setShowAdd(true); setAllowClipboardPrompt(false); }}
            style={{ backgroundColor: '#03acce', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 }}
          >
            <Text style={{ color: '#000', fontWeight: '700' }}>Adicionar PlusCode</Text>
          </TouchableOpacity>
        </View>
      ) : null}

  <ButtonAddPlusRN onAdd={() => { setAllowClipboardPrompt(true); setShowAdd(true); }} onList={() => setShowList(true)} />

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
