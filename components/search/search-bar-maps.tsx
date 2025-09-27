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
    } else {
      closeBottomSheet();
    }
  }, [visible]);

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
        const locationText = `${address.street || ''} ${address.streetNumber || ''}`.trim() ||
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
      const results = await GoogleMapsAPI.searchPlaces(query);
      setSearchResults(results);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar locais');
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
      const details = await GoogleMapsAPI.getPlaceDetails(result.place_id);
      if (details) {
        const location: SearchLocation = {
          placeId: result.place_id,
          description: result.description,
          coordinates: {
            latitude: details.lat,
            longitude: details.lng,
          },
        };

        setDestinationQuery(result.structured_formatting.main_text);
        onDestinationSelect(location);
        setSearchResults([]);
        closeBottomSheet();
      } else {
        Alert.alert('Erro', 'Não foi possível obter coordenadas do local');
      }
    } catch (error) {
      console.error('Location select error:', error);
      Alert.alert('Erro', 'Não foi possível obter detalhes do local');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      className="flex-row items-center p-4 border-b border-gray-100"
      onPress={() => handleLocationSelect(item)}
    >
      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
        <Ionicons name="location-outline" size={20} color="#666" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium text-gray-900">
          {item.structured_formatting.main_text}
        </Text>
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
              placeholder="Para onde?"
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
              <Text className="text-gray-500 mt-2">Searching...</Text>
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