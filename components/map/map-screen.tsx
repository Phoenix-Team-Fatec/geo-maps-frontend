import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MapView, { Marker, Polyline, Polygon, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import SearchScreen from '@/components/search/search-bar-maps';
import { SearchLocation } from '@/types/location';
import { loadFullProjectArea, ProjectArea } from '@/utils/geojson';
import { GoogleMapsAPI } from '@/services/google-maps-api';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

type MapScreenProps = {
  userProperties?: any[];
  pickMode?: boolean; // quando true, o clique no mapa devolve coords
  onMapPick?: (coords: { latitude: number; longitude: number }) => void; // callback
};


export default function MapScreen({ userProperties = [], pickMode = false, onMapPick }: MapScreenProps) {
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
    // Carregar área do projeto
    const fullArea = await loadFullProjectArea();
    if (fullArea) {
      setProjectArea(fullArea);
      setProjectAreaCenter(fullArea.center);
      setLocation(fullArea.center);
    }
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
            mapRef.current.animateToRegion(
              {
                ...newCoords,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              },
              1000
            );
          }
        }
      );
    } catch (error) {
      console.log('Error starting location tracking:', error);
    }
  };

  const generateRouteWithDirections = async (start: LocationCoords, end: LocationCoords) => {
    try {
      const routePoints = await GoogleMapsAPI.getDirections(start, end);
      setRouteCoordinates(routePoints);
    } catch (error) {
      console.error('Error generating route:', error);
      // Fallback to straight line
      const fallbackRoute = [start, end];
      setRouteCoordinates(fallbackRoute);
    }
  };

  const handleDestinationSelect = (searchLocation: SearchLocation) => {
    setDestinationLocation(searchLocation);
    if (searchLocation.coordinates) {
      setDestination(searchLocation.coordinates);
      generateRoute(searchLocation.coordinates);
    }
  };

  const generateRoute = async (dest?: LocationCoords) => {
    const start = location;
    const destination = dest || destinationLocation?.coordinates;

    if (start && destination) {
      await generateRouteWithDirections(start, destination);
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

  //  quando propriedades do usuário carregarem, centralizar no primeiro polígono
  useEffect(() => {
    if (userProperties.length > 0 && mapRef.current) {
      const [lng, lat] = userProperties[0].geometry.coordinates[0][0]; // primeiro ponto do polígono
      mapRef.current.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [userProperties]);

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
        <TouchableOpacity
          className="bg-[#00D4FF] px-6 py-3 rounded-lg"
          onPress={getLocationPermission}
        >
          <Text className="text-white text-base font-semibold">Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // fallback inicial (caso não tenha propriedade ainda)
  const initialRegion: Region = projectAreaCenter
    ? {
        latitude: projectAreaCenter.latitude,
        longitude: projectAreaCenter.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: -23.5505,
        longitude: -46.6333,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

const handleMapPress = (e: any) => {
  if (!pickMode) return;
  const { latitude, longitude } = e.nativeEvent.coordinate;
  onMapPick && onMapPick({ latitude, longitude });
};

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Search Bar */}
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
          <TouchableOpacity className="ml-2 p-1" onPress={clearDestination}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isNavigating}
        onPress={handleMapPress}
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

        {/* User Properties Polygons */}
        {userProperties.map((feature, idx) => {
          const coords = feature.geometry.coordinates[0].map(
            ([lng, lat]: number[]) => ({
              latitude: lat,
              longitude: lng,
            })
          );

          return (
            <Polygon
              key={feature.id || idx}
              coordinates={coords}
              fillColor="rgba(255, 193, 7, 0.3)"
              strokeColor="#FFC107"
              strokeWidth={2}
            />
          );
        })}

        {/* Current Location Marker */}
        {location && (
          <Marker coordinate={location} title="Sua localização" pinColor="#00D4FF" />
        )}

        {/* Destination Marker */}
        {destinationLocation?.coordinates && (
          <Marker
            coordinate={destinationLocation.coordinates}
            title={destinationLocation.description}
            pinColor="#FF5722"
          />
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor="#00D4FF" />
        )}
      </MapView>

      {/* Navigation Controls */}
      {destination && !isNavigating && (
        <View className="absolute bottom-8 left-4 right-4 z-10">
          <TouchableOpacity
            className="bg-green-500 flex-row items-center justify-center py-4 rounded-3xl shadow-2xl elevation-6"
            onPress={startNavigation}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text className="text-white text-lg font-semibold ml-2">Iniciar rota</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cancel Navigation */}
      {isNavigating && (
        <View className="absolute bottom-8 left-4 right-4 z-10">
          <TouchableOpacity
            className="bg-red-600 flex-row items-center justify-center py-4 rounded-3xl shadow-2xl elevation-6"
            onPress={cancelNavigation}
          >
            <Ionicons name="close" size={20} color="#fff" />
            <Text className="text-white text-lg font-semibold ml-2">Cancelar rota</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Screen Bottom Sheet */}
      <SearchScreen
        visible={showSearchScreen}
        onDestinationSelect={handleDestinationSelect}
        onClose={() => setShowSearchScreen(false)}
        currentLocation={location || undefined}
      />
    </View>
  );
}
