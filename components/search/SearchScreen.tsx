import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult, LocationCoords, SearchLocation } from '@/types/location';
import { GoogleMapsAPI } from '@/services/google-maps-api';
import * as Location from 'expo-location';
import PlusCodeStorage from '@/services/PlusCodeStorage';
import NetInfo from '@react-native-community/netinfo';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

interface SearchScreenProps {
  onDestinationSelect: (location: SearchLocation) => void;
  onClose: () => void;
  currentLocation?: LocationCoords;
  visible: boolean;
}

export default function SearchScreen({
  onDestinationSelect,
  onClose,
  currentLocation,
  visible,
}: SearchScreenProps) {
  const [destinationQuery, setDestinationQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocationText, setCurrentLocationText] = useState('Localizando...');
  const [isOnline, setIsOnline] = useState(true);
  const [cacheInfo, setCacheInfo] = useState<string>('');

  const translateY = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > BOTTOM_SHEET_HEIGHT * 0.3) {
          closeBottomSheet();
        } else {
          showBottomSheet();
        }
      },
    })
  ).current;

  useEffect(() => {
    getCurrentLocationText();
  }, [currentLocation]);

  useEffect(() => {
    if (visible) {
      showBottomSheet();
      initializeStorage();
      setupNetworkListener();
    } else {
      closeBottomSheet();
    }
  }, [visible]);

  // Monitora status da conexão
  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
      updateCacheInfo();
    });

    return () => unsubscribe();
  };

  // Inicializa o storage e sincroniza se necessário
  const initializeStorage = async () => {
    try {
      await PlusCodeStorage.initialize();
      await updateCacheInfo();
    } catch (error) {
      console.error('Erro ao inicializar storage:', error);
    }
  };

  // Atualiza informações do cache
  const updateCacheInfo = async () => {
    const status = await PlusCodeStorage.getSyncStatus();
    if (status.lastSync) {
      const date = new Date(status.lastSync);
      const timeAgo = getTimeAgo(date);
      setCacheInfo(`${status.totalCached} locais • Atualizado ${timeAgo}`);
    } else {
      setCacheInfo(`${status.totalCached} locais salvos`);
    }
  };

  // Calcula tempo desde última sincronização
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'agora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days}d`;
  };

  const showBottomSheet = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeBottomSheet = () => {
    Animated.timing(translateY, {
      toValue: BOTTOM_SHEET_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const getCurrentLocationText = async () => {
    if (currentLocation) {
      try {
        const [address] = await Location.reverseGeocodeAsync(currentLocation);
        const locationText =
          `${address.street || ''} ${address.streetNumber || ''}`.trim() ||
          `${address.district || address.city || 'Localização atual'}`;
        setCurrentLocationText(locationText);
      } catch {
        setCurrentLocationText('Localização atual');
      }
    }
  };

  const searchPlaces = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Busca Plus Codes (usa cache se offline)
      const plusCodes = await PlusCodeStorage.searchPlusCodes(query);

      const plusCodeResults: SearchResult[] = plusCodes.map((pc) => ({
        place_id: `pluscode_${pc.id}`,
        description: `${pc.surname} (Plus Code: ${pc.pluscode_cod})`,
        structured_formatting: {
          main_text: pc.surname,
          secondary_text: `Plus Code: ${pc.pluscode_cod}`,
        },
        isPlusCode: true,
        coordinates: pc.cordinates,
      }));

      // Busca Google Maps apenas se online
      let googleResults: SearchResult[] = [];
      if (isOnline) {
        try {
          googleResults = await GoogleMapsAPI.searchPlaces(query);
        } catch (error) {
          console.log('Google Maps indisponível, usando apenas cache');
        }
      }

      setSearchResults([...plusCodeResults, ...googleResults]);
    } catch (error) {
      console.error('Erro na busca:', error);
      Alert.alert(
        'Erro na busca',
        isOnline
          ? 'Não foi possível buscar locais'
          : 'Modo offline - mostrando apenas locais salvos'
      );
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setDestinationQuery(text);
    searchPlaces(text);
  };

  const handleLocationSelect = async (result: SearchResult) => {
    setIsLoading(true);
    try {
      let location: SearchLocation;

      if (result.isPlusCode && result.coordinates) {
        location = {
          placeId: result.place_id,
          description: result.description,
          coordinates: result.coordinates,
        };
      } else {
        if (!isOnline) {
          Alert.alert(
            'Sem conexão',
            'Você precisa estar online para selecionar locais do Google Maps'
          );
          setIsLoading(false);
          return;
        }

        const details = await GoogleMapsAPI.getPlaceDetails(result.place_id);
        if (!details) {
          Alert.alert('Erro', 'Não foi possível obter coordenadas do local');
          return;
        }

        location = {
          placeId: result.place_id,
          description: result.description,
          coordinates: {
            latitude: details.lat,
            longitude: details.lng,
          },
        };
      }

      setDestinationQuery(result.structured_formatting.main_text);
      onDestinationSelect(location);
      setSearchResults([]);
      closeBottomSheet();
    } catch (error) {
      console.error('Location select error:', error);
      Alert.alert('Erro', 'Não foi possível obter detalhes do local');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncPress = async () => {
    if (!isOnline) {
      Alert.alert('Sem conexão', 'Conecte-se à internet para sincronizar');
      return;
    }

    setIsLoading(true);
    const success = await PlusCodeStorage.syncPlusCodes(true);
    setIsLoading(false);

    if (success) {
      Alert.alert('Sucesso', 'Dados sincronizados com sucesso!');
      await updateCacheInfo();
    } else {
      Alert.alert('Erro', 'Não foi possível sincronizar os dados');
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-100"
      onPress={() => handleLocationSelect(item)}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          item.isPlusCode ? 'bg-blue-100' : 'bg-gray-100'
        }`}
      >
        <Ionicons
          name={item.isPlusCode ? 'qr-code-outline' : 'location-outline'}
          size={20}
          color={item.isPlusCode ? '#00D4FF' : '#666'}
        />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-base font-medium text-gray-900">
            {item.structured_formatting.main_text}
          </Text>
          {item.isPlusCode && (
            <View className="ml-2 px-2 py-0.5 bg-blue-100 rounded">
              <Text className="text-xs text-blue-600 font-medium">OFFLINE</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-500">
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/50">
      <Animated.View
        style={{
          transform: [{ translateY }],
          height: BOTTOM_SHEET_HEIGHT,
          marginTop: SCREEN_HEIGHT - BOTTOM_SHEET_HEIGHT,
        }}
        className="bg-white rounded-t-3xl"
        {...panResponder.panHandlers}
      >
        {/* Drag Handle */}
        <View className="items-center py-3">
          <View className="w-10 h-1 bg-gray-300 rounded-full" />
        </View>

        {/* Status Bar */}
        <View className="px-4 pb-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                isOnline ? 'bg-green-500' : 'bg-orange-500'
              }`}
            />
            <Text className="text-xs text-gray-500">
              {isOnline ? 'Online' : 'Modo Offline'}
            </Text>
            {cacheInfo && (
              <>
                <Text className="text-xs text-gray-400 mx-1">•</Text>
                <Text className="text-xs text-gray-500">{cacheInfo}</Text>
              </>
            )}
          </View>

          {isOnline && (
            <TouchableOpacity
              onPress={handleSyncPress}
              className="flex-row items-center"
              disabled={isLoading}
            >
              <Ionicons
                name="sync-outline"
                size={16}
                color="#00D4FF"
                className="mr-1"
              />
              <Text className="text-xs text-blue-500 font-medium">Sincronizar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Current Location Display */}
        {currentLocation && (
          <View className="px-4 pb-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="locate" size={20} color="#00D4FF" />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500">Sua localização</Text>
                <Text className="text-base font-medium text-gray-900">
                  {currentLocationText}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Search Input */}
        <View className="p-4">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-4 py-3">
            <Ionicons name="search" size={20} color="#666" className="mr-3" />
            <TextInput
              className="flex-1 text-base text-gray-900"
              placeholder={
                isOnline
                  ? 'Para onde?'
                  : 'Buscar em locais salvos...'
              }
              value={destinationQuery}
              onChangeText={handleInputChange}
              autoFocus={true}
            />
          </View>
        </View>

        {/* Search Results */}
        <View className="flex-1">
          {isLoading && (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#00D4FF" />
              <Text className="text-gray-500 mt-2">
                {isOnline ? 'Buscando...' : 'Carregando do cache...'}
              </Text>
            </View>
          )}

          {!isLoading && searchResults.length === 0 && destinationQuery.length >= 2 && (
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="search-outline" size={48} color="#CCC" />
              <Text className="text-gray-500 mt-3 text-center">
                {isOnline
                  ? 'Nenhum resultado encontrado'
                  : 'Nenhum local salvo corresponde à sua busca'}
              </Text>
              {!isOnline && (
                <Text className="text-gray-400 mt-2 text-center text-sm">
                  Conecte-se à internet para buscar mais locais
                </Text>
              )}
            </View>
          )}

          {searchResults.length > 0 && (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.place_id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Animated.View>
    </View>
  );
}