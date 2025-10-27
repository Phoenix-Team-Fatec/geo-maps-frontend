import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import MapView, { Marker, Polyline, Polygon, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import SearchScreen from '@/components/search/search-bar-maps';
import { SearchLocation } from '@/types/location';
import { loadFullProjectArea, ProjectArea } from '@/utils/geojson';
import { traceRoute } from '@/services/routes-client';
import ConditionModal from '../modals/condition_modal';
import ProximityAlert from './ProximityAlert';
import { useProximityAlerts } from '@/hooks/useProximityAlerts';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface RouteInfo {
  distance: string;
  duration: string;
  steps: number;
}

interface RouteStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  end_location: { lat: number; lng: number };
  html_instructions: string;
  maneuver?: string;
  polyline: { points: string };
}

type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

type MapScreenProps = {
  userProperties?: any[];
  pickMode?: boolean;
  onMapPick?: (coords: { latitude: number; longitude: number }) => void;
};

export default function MapScreen({ userProperties = [], pickMode = false, onMapPick }: MapScreenProps) {
  // Estados de localização
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [projectAreaCenter, setProjectAreaCenter] = useState<LocationCoords | null>(null);
  const [projectArea, setProjectArea] = useState<ProjectArea | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConditionModal, setShowConditionModal] = useState(false);
  
  // Origem e Destino
  const [origin, setOrigin] = useState<LocationCoords | null>(null);
  const [originLocation, setOriginLocation] = useState<SearchLocation | null>(null);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<SearchLocation | null>(null);
  
  // Rota
  const [routeCoordinates, setRouteCoordinates] = useState<LocationCoords[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [remainingDistance, setRemainingDistance] = useState<string>('');
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [remainingDistanceValue, setRemainingDistanceValue] = useState<number>(0);
  const [remainingTimeValue, setRemainingTimeValue] = useState<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [nextInstruction, setNextInstruction] = useState<string>('Continue em frente');
  const [nextInstructionDistance, setNextInstructionDistance] = useState<string>('');
  const [arrivalTime, setArrivalTime] = useState<string>('--:--');
  
  // UI
  const [showSearchScreen, setShowSearchScreen] = useState(false);
  const [searchMode, setSearchMode] = useState<'origin' | 'destination'>('destination');
  const [travelMode, setTravelMode] = useState<TravelMode>('driving');
  const [showTravelModeModal, setShowTravelModeModal] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [mapPadding, setMapPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  const mapRef = useRef<MapView>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  // Proximity alerts for occurrences
  const { occurrences, activeAlert, dismissAlert } = useProximityAlerts({
    currentLocation: location,
    alertRadius: 500, // 500 meters
    enabled: !pickMode, // Only show alerts when not in pick mode
  });

  const getPlusCodePoint = (feature: any) => {
  const pc = feature?.pluscode;
  if (!pc) return null;
  const c = pc.cordinates ?? pc.coordinates; // backend pode mandar 'cordinates' ou 'coordinates'
  const lat = c?.latitude ?? c?.lat ?? c?.Latitude;
  const lng = c?.longitude ?? c?.lng ?? c?.Longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: Number(lat), longitude: Number(lng) };
};

  useEffect(() => {
    initializeApp();
    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
      }
    };
  }, []);

  // Auto-set origin quando localização atual mudar
  useEffect(() => {
    if (location && useCurrentLocation) {
      setOrigin(location);
    }
  }, [location, useCurrentLocation]);

  const initializeApp = async () => {
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
      setOrigin(coords);
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
          distanceInterval: 5,
        },
        (locationUpdate) => {
          const newCoords = {
            latitude: locationUpdate.coords.latitude,
            longitude: locationUpdate.coords.longitude,
          };
          setLocation(newCoords);
          
          if (useCurrentLocation) {
            setOrigin(newCoords);
          }

          // Atualizar navegação em tempo real
          if (isNavigating && routeSteps.length > 0) {
            updateNavigationProgress(newCoords);
          }

          if (mapRef.current && isNavigating) {
            mapRef.current.animateCamera(
              {
                center: newCoords,
                zoom: 18,
                pitch: 60,
              },
              { duration: 1000 }
            );
          }
        }
      );
    } catch (error) {
      console.log('Error starting location tracking:', error);
    }
  };

  // Calcular distância entre dois pontos (Haversine)
  const calculateDistance = (coord1: LocationCoords, coord2: LocationCoords): number => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distância em metros
  };

  // Atualizar progresso da navegação
  const updateNavigationProgress = (currentLocation: LocationCoords) => {
    if (!routeSteps.length || currentStepIndex >= routeSteps.length) return;

    const currentStep = routeSteps[currentStepIndex];
    const stepEndLocation = {
      latitude: currentStep.end_location.lat,
      longitude: currentStep.end_location.lng,
    };

    const distanceToStepEnd = calculateDistance(currentLocation, stepEndLocation);

    // Se chegou perto do fim do step atual (< 30m), avança para próximo
    if (distanceToStepEnd < 30 && currentStepIndex < routeSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      return;
    }

    // Calcular distância e tempo restante total
    let totalRemainingDistance = distanceToStepEnd;
    let totalRemainingTime = currentStep.duration.value;

    // Somar steps restantes
    for (let i = currentStepIndex + 1; i < routeSteps.length; i++) {
      totalRemainingDistance += routeSteps[i].distance.value;
      totalRemainingTime += routeSteps[i].duration.value;
    }

    // Atualizar estados
    setRemainingDistanceValue(totalRemainingDistance);
    setRemainingTimeValue(totalRemainingTime);
    setRemainingDistance(formatDistance(totalRemainingDistance));
    setRemainingTime(formatDuration(totalRemainingTime));
    setArrivalTime(calculateArrivalTime(totalRemainingTime));

    // Atualizar instrução atual
    const cleanInstruction = cleanHtmlInstructions(currentStep.html_instructions);
    setNextInstruction(cleanInstruction);
    setNextInstructionDistance(formatDistance(distanceToStepEnd));
  };

  // Limpar HTML das instruções
  const cleanHtmlInstructions = (html: string): string => {
    return html
      .replace(/<[^>]*>/g, '') // Remove tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
  };

  // Formatar distância
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Formatar duração
  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Calcular hora de chegada
  const calculateArrivalTime = (secondsRemaining: number): string => {
    const arrival = new Date(Date.now() + secondsRemaining * 1000);
    return arrival.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Obter ícone da manobra
  const getManeuverIcon = (maneuver?: string): string => {
    if (!maneuver) return 'arrow-up';
    
    const maneuverMap: { [key: string]: string } = {
      'turn-left': 'arrow-back',
      'turn-right': 'arrow-forward',
      'turn-sharp-left': 'arrow-back',
      'turn-sharp-right': 'arrow-forward',
      'turn-slight-left': 'arrow-up',
      'turn-slight-right': 'arrow-up',
      'straight': 'arrow-up',
      'ramp-left': 'arrow-up',
      'ramp-right': 'arrow-up',
      'merge': 'git-merge',
      'fork-left': 'git-branch',
      'fork-right': 'git-branch',
      'roundabout-left': 'sync',
      'roundabout-right': 'sync',
    };

    return maneuverMap[maneuver] || 'arrow-up';
  };

  const generateRoute = async () => {
    if (!origin || !destination) {
      Alert.alert('Erro', 'Selecione origem e destino');
      return;
    }

    setIsLoading(true);
    try {
      const { coords, rawRoute } = await traceRoute(origin, destination, travelMode);
      setRouteCoordinates(coords);

      // Extrair informações da rota
      if (rawRoute?.legs?.[0]) {
        const leg = rawRoute.legs[0];
        setRouteInfo({
          distance: leg.distance?.text || 'N/A',
          duration: leg.duration?.text || 'N/A',
          steps: leg.steps?.length || 0,
        });

        // Salvar steps para navegação
        if (leg.steps) {
          setRouteSteps(leg.steps);
        }
      }

      // Ajustar mapa para mostrar toda a rota com animação suave
      if (mapRef.current && coords.length > 0) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 150, right: 80, bottom: 400, left: 80 },
            animated: true,
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error generating route:', error);
      Alert.alert('Erro', 'Não foi possível gerar a rota');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (searchLocation: SearchLocation) => {
    if (searchMode === 'origin') {
      setOriginLocation(searchLocation);
      setOrigin(searchLocation.coordinates);
      setUseCurrentLocation(false);
      
      // Animar para o ponto de origem selecionado
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current?.animateToRegion(
            {
              ...searchLocation.coordinates,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }, 300);
      }
    } else {
      setDestinationLocation(searchLocation);
      setDestination(searchLocation.coordinates);
      
      // Animar para o destino selecionado com zoom suave
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current?.animateCamera(
            {
              center: searchLocation.coordinates,
              zoom: 15,
              pitch: 0,
              heading: 0,
            },
            { duration: 1200 }
          );
        }, 300);
      }
    }
  };

  const startNavigation = () => {
    if (!destination || !routeCoordinates.length || !routeSteps.length) {
      Alert.alert('Erro', 'Gere uma rota primeiro');
      return;
    }

    setIsNavigating(true);
    setCurrentStepIndex(0);
    
    // Inicializar com valores da rota completa
    const leg = routeSteps.reduce((acc, step) => ({
      distance: acc.distance + step.distance.value,
      duration: acc.duration + step.duration.value,
    }), { distance: 0, duration: 0 });

    setRemainingDistanceValue(leg.distance);
    setRemainingTimeValue(leg.duration);
    setRemainingDistance(formatDistance(leg.distance));
    setRemainingTime(formatDuration(leg.duration));
    setArrivalTime(calculateArrivalTime(leg.duration));

    // Configurar primeira instrução
    if (routeSteps[0]) {
      const cleanInstruction = cleanHtmlInstructions(routeSteps[0].html_instructions);
      setNextInstruction(cleanInstruction);
      setNextInstructionDistance(routeSteps[0].distance.text);
    }

    startLocationTracking();

    // Centralizar no ponto de origem com câmera 3D
    if (mapRef.current && origin) {
      setTimeout(() => {
        mapRef.current?.animateCamera(
          {
            center: origin,
            zoom: 18,
            heading: 0,
            pitch: 60,
          },
          { duration: 1500 }
        );
      }, 300);
    }
  };

  const cancelNavigation = () => {
    setIsNavigating(false);
    setCurrentStepIndex(0);
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }

    // Resetar câmera para visão geral
    if (mapRef.current && routeCoordinates.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(routeCoordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }, 300);
    }
  };

  const clearRoute = () => {
    setOrigin(location);
    setOriginLocation(null);
    setDestination(null);
    setDestinationLocation(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    setRouteSteps([]);
    setIsNavigating(false);
    setUseCurrentLocation(true);
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }

    // Voltar para visão inicial
    if (mapRef.current && location) {
      setTimeout(() => {
        mapRef.current?.animateToRegion(
          {
            ...location,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          1000
        );
      }, 200);
    }
  };

  const handleMapPress = (e: any) => {
    if (!pickMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onMapPick && onMapPick({ latitude, longitude });
  };

  useEffect(() => {
    if (userProperties.length > 0 && mapRef.current) {
      const [lng, lat] = userProperties[0].geometry.coordinates[0][0];
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

  const getTravelModeIcon = (mode: TravelMode) => {
    switch (mode) {
      case 'driving': return 'car';
      case 'walking': return 'walk';
      case 'bicycling': return 'bicycle';
      case 'transit': return 'bus';
    }
  };

  const getTravelModeLabel = (mode: TravelMode) => {
    switch (mode) {
      case 'driving': return 'Carro';
      case 'walking': return 'A pé';
      case 'bicycling': return 'Bicicleta';
      case 'transit': return 'Transporte';
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style={isNavigating ? "light" : "dark"} />

      {/* Proximity Alert - Waze style */}
      {activeAlert && !isNavigating && (
        <ProximityAlert
          occurrence={activeAlert.occurrence}
          distance={activeAlert.distance}
          onDismiss={dismissAlert}
        />
      )}

      {/* UI Normal - Planejamento de Rota */}
      {!isNavigating && (
        <>
          {/* Origin and Destination Bars */}
          <View className="absolute top-16 left-4 right-4 z-10">
            {/* Origin Bar */}
            <View className="bg-white rounded-2xl shadow-lg elevation-4 mb-2">
              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                onPress={() => {
                  setSearchMode('origin');
                  setShowSearchScreen(true);
                }}
              >
                <View className="w-3 h-3 bg-green-500 rounded-full mr-3" />
                <Text className="flex-1 text-gray-900 text-base">
                  {originLocation?.description || (useCurrentLocation ? 'Minha localização' : 'Origem')}
                </Text>
                {!useCurrentLocation && originLocation && (
                  <TouchableOpacity
                    onPress={() => {
                      setOrigin(location);
                      setOriginLocation(null);
                      setUseCurrentLocation(true);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <View className="h-px bg-gray-200 mx-4" />

              {/* Destination Bar */}
              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                onPress={() => {
                  setSearchMode('destination');
                  setShowSearchScreen(true);
                }}
              >
                <View className="w-3 h-3 bg-red-500 rounded-full mr-3" />
                <Text className="flex-1 text-gray-500 text-base">
                  {destinationLocation?.description || 'Para onde?'}
                </Text>
                {destinationLocation && (
                  <TouchableOpacity onPress={clearRoute}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {/* Travel Mode Selector */}
            {origin && destination && !routeCoordinates.length && (
              <View className="bg-white rounded-2xl shadow-lg elevation-4 px-4 py-3 flex-row items-center justify-between">
                <TouchableOpacity
                  className="flex-row items-center flex-1"
                  onPress={() => setShowTravelModeModal(true)}
                >
                  <Ionicons name={getTravelModeIcon(travelMode)} size={20} color="#00D4FF" />
                  <Text className="ml-2 text-gray-900 font-medium">{getTravelModeLabel(travelMode)}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-[#00D4FF] px-6 py-2 rounded-full"
                  onPress={generateRoute}
                >
                  <Text className="text-white font-semibold">Traçar Rota</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Route Info Card */}
          {routeInfo && (
            <View className="absolute bottom-8 left-4 right-4 z-10 bg-white rounded-3xl shadow-2xl elevation-6 p-4">
              <View className="flex-row justify-around mb-4">
                <View className="items-center">
                  <Ionicons name="navigate" size={24} color="#00D4FF" />
                  <Text className="text-2xl font-bold text-gray-900 mt-1">{routeInfo.distance}</Text>
                  <Text className="text-sm text-gray-500">Distância</Text>
                </View>
                <View className="w-px bg-gray-200" />
                <View className="items-center">
                  <Ionicons name="time" size={24} color="#00D4FF" />
                  <Text className="text-2xl font-bold text-gray-900 mt-1">{routeInfo.duration}</Text>
                  <Text className="text-sm text-gray-500">Tempo</Text>
                </View>
                <View className="w-px bg-gray-200" />
                <View className="items-center">
                  <Ionicons name="list" size={24} color="#00D4FF" />
                  <Text className="text-2xl font-bold text-gray-900 mt-1">{routeInfo.steps}</Text>
                  <Text className="text-sm text-gray-500">Etapas</Text>
                </View>
              </View>

              <TouchableOpacity
                className="bg-green-500 flex-row items-center justify-center py-4 rounded-2xl"
                onPress={startNavigation}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text className="text-white text-lg font-semibold ml-2">Iniciar Navegação</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* UI de Navegação - Estilo Google Maps */}
      {isNavigating && (
        <>
          {/* Header com tempo e botão X */}
          <View className="absolute top-0 left-0 right-0 z-10 pt-14 pb-6 px-4">
            <View 
              className="bg-gray-900/95 rounded-3xl px-5 py-4 shadow-2xl"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 10,
              }}
            >
              <View className="flex-row items-start justify-between">
                {/* Info de tempo e distância */}
                <View className="flex-1 mr-4">
                  <Text className="text-white text-5xl font-bold tracking-tight">
                    {remainingTime || routeInfo?.duration || '--'}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <Text className="text-white text-base font-semibold">
                      {remainingDistance || routeInfo?.distance || '--'}
                    </Text>
                    <View className="w-1.5 h-1.5 bg-white/70 rounded-full mx-2.5" />
                    <Text className="text-white/90 text-sm font-medium flex-1" numberOfLines={1}>
                      {destinationLocation?.description || 'Destino'}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1.5">
                    <Ionicons name="time-outline" size={12} color="#A0AEC0" />
                    <Text className="text-gray-300 text-xs ml-1 font-medium">
                      Chegada: {arrivalTime}
                    </Text>
                  </View>
                </View>

                {/* Botão X */}
                <TouchableOpacity
                  className="bg-white/90 rounded-full w-10 h-10 items-center justify-center"
                  onPress={cancelNavigation}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                >
                  <Ionicons name="close" size={22} color="#1F2937" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Botão de recentralizar */}
          <View className="absolute bottom-52 right-4 z-10">
            <TouchableOpacity
              className="bg-white rounded-full w-14 h-14 items-center justify-center shadow-xl elevation-8"
              onPress={() => {
                if (mapRef.current && location) {
                  mapRef.current.animateCamera(
                    {
                      center: location,
                      zoom: 18,
                      heading: 0,
                      pitch: 60,
                    },
                    { duration: 500 }
                  );
                }
              }}
            >
              <Ionicons name="navigate-circle" size={32} color="#00D4FF" />
            </TouchableOpacity>
          </View>

          {/* Card de instrução inferior - Estilo Waze/Google Maps */}
          <View className="absolute bottom-0 left-0 right-0 z-10">
            <View className="bg-white rounded-t-3xl shadow-2xl elevation-12 px-5 pt-4 pb-8">
              {/* Indicador de arraste */}
              <View className="items-center mb-3">
                <View className="w-10 h-1 bg-gray-300 rounded-full" />
              </View>

              {/* Instrução principal */}
              <View className="flex-row items-center">
                {/* Ícone da instrução */}
                <View className="bg-blue-500 rounded-2xl w-16 h-16 items-center justify-center mr-4 shadow-lg">
                  <Ionicons 
                    name={getManeuverIcon(routeSteps[currentStepIndex]?.maneuver)} 
                    size={36} 
                    color="#FFF" 
                  />
                </View>

                {/* Texto da instrução */}
                <View className="flex-1">
                  <Text className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">
                    {nextInstructionDistance ? `Em ${nextInstructionDistance}` : 'Agora'}
                  </Text>
                  <Text className="text-gray-900 text-xl font-bold leading-tight" numberOfLines={2}>
                    {nextInstruction}
                  </Text>
                </View>

                {/* Ícone do modo de transporte */}
                <View className="ml-2">
                  <Ionicons name={getTravelModeIcon(travelMode)} size={24} color="#9CA3AF" />
                </View>
              </View>

              {/* Próxima instrução (preview) */}
              {currentStepIndex < routeSteps.length - 1 && (
                <View className="flex-row items-center mt-4 pt-4 border-t border-gray-100">
                  <View className="bg-gray-100 rounded-lg w-8 h-8 items-center justify-center mr-3">
                    <Ionicons 
                      name={getManeuverIcon(routeSteps[currentStepIndex + 1]?.maneuver)} 
                      size={16} 
                      color="#6B7280" 
                    />
                  </View>
                  <Text className="text-gray-500 text-sm flex-1" numberOfLines={1}>
                    Depois, {cleanHtmlInstructions(routeSteps[currentStepIndex + 1]?.html_instructions || '')}
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    {routeSteps[currentStepIndex + 1]?.distance.text}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isNavigating}
        onPress={handleMapPress}
        rotateEnabled={isNavigating}
        pitchEnabled={isNavigating}
        showsCompass={false}
        loadingEnabled={true}
        mapPadding={isNavigating ? { top: 200, right: 0, bottom: 280, left: 0 } : { top: 0, right: 0, bottom: 0, left: 0 }}
      >
        {/* Project Area - Ocultar durante navegação */}
        {!isNavigating && projectArea && (
          <Polygon
            coordinates={projectArea.coordinates}
            fillColor="rgba(0, 212, 255, 0.2)"
            strokeColor="#00D4FF"
            strokeWidth={2}
          />
        )}

        {!isNavigating && userProperties.map((feature, idx) => {
        const point = getPlusCodePoint(feature);
        if (!point) return null;

        // textos úteis para o tooltip
        const title = feature?.pluscode?.surname
          ? `Plus Code • ${feature.pluscode.surname}`
          : 'Plus Code';
        const description = feature?.pluscode?.pluscode_cod ?? '';

        return (
          <Marker
            key={`pluscode-${feature.id || idx}`}
            coordinate={point}
            title={title}
            description={description}
          >
            {/* Ícone customizado (bolinha com ícone) - opcional */}
            <View style={{
              backgroundColor: '#10b981',
              borderRadius: 18,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: '#FFF',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}>
              <Ionicons name="add-circle" size={20} color="#fff" />
            </View>
          </Marker>
        );
      })}

        {/* User Properties - Ocultar durante navegação */}
        {!isNavigating && userProperties.map((feature, idx) => {
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

        {/* Origin Marker - Ocultar durante navegação */}
        {!isNavigating && origin && !useCurrentLocation && (
          <Marker
            coordinate={origin}
            title={originLocation?.description || "Origem"}
            pinColor="green"
          />
        )}

        {/* Destination Marker */}
        {destination && (
          <Marker
            coordinate={destination}
            title={destinationLocation?.description || "Destino"}
            pinColor="red"
          >
            <View className="items-center">
              <View className="bg-red-500 w-10 h-10 rounded-full items-center justify-center shadow-lg">
                <Ionicons name="location" size={24} color="#FFF" />
              </View>
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={isNavigating ? 6 : 4}
            strokeColor="#00D4FF"
          />
        )}

        {/* Occurrence Markers - Show only when not navigating */}
        {!isNavigating && occurrences.map((occ, idx) => {
          const occId = occ._id || `${occ.coordinate.latitude}-${occ.coordinate.longitude}-${idx}`;

          // Get icon and color based on occurrence type and severity
          const getIconName = (type: string): keyof typeof Ionicons.glyphMap => {
            const typeMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
              'trânsito': 'car',
              'acidente': 'warning',
              'veículo parado': 'alert-circle',
              'veículo no acostamento': 'alert-circle',
              'polícia': 'shield',
              'polícia rodoviária': 'shield',
            };
            return typeMap[type.toLowerCase()] || 'information-circle';
          };

          const getColor = (severity: string): string => {
            const colorMap: { [key: string]: string } = {
              'leve': '#00D4FF',
              'moderada': '#ffb703',
              'intensa': '#ff006e',
            };
            return colorMap[severity.toLowerCase()] || '#00D4FF';
          };

          return (
            <Marker
              key={occId}
              coordinate={{
                latitude: occ.coordinate.latitude,
                longitude: occ.coordinate.longitude,
              }}
              title={occ.tipo}
              description={`Gravidade: ${occ.gravidade}`}
            >
              <View style={{
                backgroundColor: getColor(occ.gravidade),
                borderRadius: 25,
                width: 50,
                height: 50,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: '#FFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}>
                <Ionicons name={getIconName(occ.tipo)} size={28} color="#FFF" />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Travel Mode Modal */}
      <Modal
        visible={showTravelModeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTravelModeModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-end"
          activeOpacity={1}
          onPress={() => setShowTravelModeModal(false)}
        >
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">Modo de Viagem</Text>
            
            {(['driving', 'walking', 'bicycling', 'transit'] as TravelMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                className={`flex-row items-center p-4 rounded-2xl mb-2 ${
                  travelMode === mode ? 'bg-blue-100' : 'bg-gray-100'
                }`}
                onPress={() => {
                  setTravelMode(mode);
                  setShowTravelModeModal(false);
                }}
              >
                <Ionicons
                  name={getTravelModeIcon(mode)}
                  size={24}
                  color={travelMode === mode ? '#00D4FF' : '#666'}
                />
                <Text
                  className={`ml-3 text-base font-medium ${
                    travelMode === mode ? 'text-[#00D4FF]' : 'text-gray-900'
                  }`}
                >
                  {getTravelModeLabel(mode)}
                </Text>
                {travelMode === mode && (
                  <Ionicons name="checkmark" size={24} color="#00D4FF" className="ml-auto" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Search Screen */}
      <SearchScreen
        visible={showSearchScreen}
        onDestinationSelect={handleLocationSelect}
        onClose={() => setShowSearchScreen(false)}
        currentLocation={location || undefined}
      />

            {/* Floating Button to Report Road Condition */}
      {!isNavigating && !showSearchScreen && (
        <View className="absolute bottom-8 right-4 z-10">
          <TouchableOpacity
            className="bg-[#00D4FF] rounded-full w-14 h-14 items-center justify-center shadow-xl elevation-8"
            onPress={() => setShowConditionModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="warning" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Condition Modal */}
      <ConditionModal
        showConditionModal={showConditionModal}
        setShowConditionModal={setShowConditionModal}
        local={location}
      />

    </View>
  );
}