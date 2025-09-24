import SearchScreen from '@/components/search/search-bar-maps';
import { SearchLocation } from '@/types/location';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, Polygon, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import SearchScreen from '@/components/search/search-bar-maps';
import { SearchLocation } from '@/types/location';
import { loadProjectArea, loadFullProjectArea, ProjectArea } from '@/utils/geojson';


interface LocationCoords {
  latitude: number;
  longitude: number;
}


type MapHandle = {
  centerOn: (coords: { latitude: number; longitude: number }) => void;
};

type Props = {
  onMapPress?: (coords: { latitude: number; longitude: number }) => void;
  onMapLongPress?: (coords: { latitude: number; longitude: number }) => void;
  onMarkerPress?: (marker: { id?: string; name?: string; latitude: number; longitude: number; isDraft?: boolean }) => void;
  markers?: { id: string; name?: string; latitude: number; longitude: number }[];
  selectedPoint?: { latitude: number; longitude: number } | null;
};

const MapScreen = forwardRef<MapHandle, Props>(({ onMapPress, onMapLongPress, onMarkerPress, markers, selectedPoint }, ref) => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [projectAreaCenter, setProjectAreaCenter] = useState<LocationCoords | null>(null);
  const [projectArea, setProjectArea] = useState<ProjectArea | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<LocationCoords[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showSearchScreen, setShowSearchScreen] = useState(false);
  const [destinationLocation, setDestinationLocation] = useState<SearchLocation | null>(null);

  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    initializeApp();
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
      }
    };
  }, []);

  const initializeApp = async () => {
    // Load full project area data
    const fullArea = await loadFullProjectArea();
    if (fullArea) {
      setProjectArea(fullArea);
      setProjectAreaCenter(fullArea.center);
      setLocation(fullArea.center); // Set initial location to project area center
    }

    // Then try to get user's actual location
    getLocationPermission();
  };

  const getLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Permissão de localização negada');
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(coords);
      setIsLoading(false);
    } catch {
      setErrorMsg('Erro ao obter localização');
      setIsLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (locationUpdate) => {
          const newCoords = {
            latitude: locationUpdate.coords.latitude,
            longitude: locationUpdate.coords.longitude,
          };
          setLocation(newCoords);

          if (mapRef.current && isNavigating) {
            mapRef.current.animateToRegion({
              ...newCoords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }
        }
      );
    } catch (error) {
      console.log('Error starting location tracking:', error);
    }
  };

  const simulateRoute = (start: LocationCoords, end: LocationCoords) => {
    const steps = 20;
    const route: LocationCoords[] = [];

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = start.latitude + (end.latitude - start.latitude) * ratio;
      const lng = start.longitude + (end.longitude - start.longitude) * ratio;
      route.push({ latitude: lat, longitude: lng });
    }

    return route;
  };

  const handleDestinationSelect = (searchLocation: SearchLocation) => {
    setDestinationLocation(searchLocation);
    if (searchLocation.coordinates) {
      setDestination(searchLocation.coordinates);
    }
    generateRoute();
  };

  const generateRoute = () => {
    const start = location; // Sempre usa a localização atual como início
    const dest = destinationLocation?.coordinates || destination;

    if (start && dest) {
      const route = simulateRoute(start, dest);
      setRouteCoordinates(route);
    }
  };

  const startNavigation = () => {
    if (!destination || !routeCoordinates.length) {
      Alert.alert('Erro', 'Selecione um destino primeiro');
      return;
    }

    setIsNavigating(true);
    startLocationTracking();

    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  };

  const cancelNavigation = () => {
    setIsNavigating(false);
    setDestination(null);
    setDestinationLocation(null);
    setRouteCoordinates([]);
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  };

  const clearDestination = () => {
    setDestination(null);
    setDestinationLocation(null);
    setRouteCoordinates([]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#1a1a2e]">
        <ActivityIndicator size="large" color="#00D4FF" />
        <Text className="mt-4 text-base text-white">Carregando mapa...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View className="flex-1 justify-center items-center bg-[#1a1a2e] p-5">
        <Ionicons name="location-outline" size={64} color="#666" />
        <Text className="text-base text-white text-center my-4">{errorMsg}</Text>
        <TouchableOpacity className="bg-[#00D4FF] px-6 py-3 rounded-lg" onPress={getLocationPermission}>
          <Text className="text-white text-base font-semibold">Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initialRegion: Region = projectAreaCenter ? {
    latitude: projectAreaCenter.latitude,
    longitude: projectAreaCenter.longitude,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  } : location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  } : {
    latitude: -23.5505,
    longitude: -46.6333,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Barra de Pesquisa */}
      <View className="absolute top-16 left-4 right-4 z-10 bg-white rounded-full shadow-lg elevation-4 px-4 py-4 flex-row items-center">
        <TouchableOpacity
          className="flex-row items-center flex-1"
          onPress={() => setShowSearchScreen(true)}
        >
          <Ionicons name="search" size={20} color="#666" className="mr-3" />
          <Text className="flex-1 text-gray-500 text-base">
            {destinationLocation?.description || 'Para onde?'}
          </Text>
        </TouchableOpacity>

        {destinationLocation && (
          <TouchableOpacity
            className="ml-2 p-1"
            onPress={clearDestination}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isNavigating}
        onPress={(e) => {
          const c = e.nativeEvent.coordinate;
          onMapPress && onMapPress({ latitude: c.latitude, longitude: c.longitude });
        }}
        onLongPress={(e) => {
          const c = e.nativeEvent.coordinate;
          onMapLongPress && onMapLongPress({ latitude: c.latitude, longitude: c.longitude });
        }}
      >
        {/* Project Area Polygon */}
        {projectArea && (
          <Polygon
            coordinates={projectArea.coordinates}
            fillColor="rgba(0, 212, 255, 0.2)"
            strokeColor="#00D4FF"
            strokeWidth={2}
          />
        )}

        {/* Current Location Marker */}
        {location && (
          <Marker
            coordinate={location}
            title="Sua localização"
            pinColor="#60b954ff"
          />
        )}


        {/* Destino */}
        {destinationLocation?.coordinates && (
          <Marker
            coordinate={destinationLocation.coordinates}
            title={destinationLocation.description}
            pinColor="#00a6ffff"
          />
        )}

        {/* Propriedades */}
        {Array.isArray(markers) && markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            title={m.name || 'Propriedade'}
            pinColor="#cc0000ff"
            onPress={() => onMarkerPress && onMarkerPress({ id: m.id, name: m.name, latitude: m.latitude, longitude: m.longitude })}
          />
        ))}

        {selectedPoint && (
          <Marker
            coordinate={selectedPoint}
            title="Ponto selecionado"
            pinColor="#ff9800"
            onPress={() => onMarkerPress && onMarkerPress({ latitude: selectedPoint.latitude, longitude: selectedPoint.longitude, isDraft: true })}
          />
        )}

        {/* Rota */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#00D4FF"
          />
        )}
      </MapView>

      {/* Navegação */}
      {destination && !isNavigating && (
        <View className="absolute bottom-24 left-4 right-4 z-10">
          <TouchableOpacity className="bg-green-500 flex-row items-center justify-center py-4 rounded-3xl shadow-2xl elevation-6" onPress={startNavigation}>
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text className="text-white text-lg font-semibold ml-2">Iniciar rota</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cancelar Navegação */}
      {isNavigating && (
        <View className="absolute bottom-24 left-4 right-4 z-10">
          <TouchableOpacity className="bg-red-600 flex-row items-center justify-center py-4 rounded-3xl shadow-2xl elevation-6" onPress={cancelNavigation}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text className="text-white text-lg font-semibold ml-2">Cancelar rota</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pesquisa */}
      <SearchScreen
        visible={showSearchScreen}
        onDestinationSelect={handleDestinationSelect}
        onClose={() => setShowSearchScreen(false)}
        currentLocation={location || undefined}
      />
    </View>
  );
});

export default MapScreen;

