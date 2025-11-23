import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WeatherData, getWeatherIconUrl } from '@/services/weather-api';

interface WeatherAlertProps {
  weather: WeatherData;
  severity: 'safe' | 'warning' | 'danger';
  message: string | null;
  locationName?: string;
  onDismiss: () => void;
  onViewDetails?: () => void;
}

/**
 * Get icon and colors based on severity
 */
function getSeverityConfig(severity: 'safe' | 'warning' | 'danger') {
  if (severity === 'danger') {
    return {
      color: '#ff006e', // Intense red/pink
      icon: 'warning' as keyof typeof Ionicons.glyphMap,
      bgOpacity: 'bg-[#ff006e]',
      title: 'ALERTA CLIMÁTICO',
    };
  }
  if (severity === 'warning') {
    return {
      color: '#ffb703', // Warning yellow/orange
      icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
      bgOpacity: 'bg-[#ffb703]',
      title: 'ATENÇÃO - CLIMA',
    };
  }
  // Safe
  return {
    color: '#00D4FF', // App accent cyan (safe)
    icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    bgOpacity: 'bg-[#00D4FF]',
    title: 'PREVISÃO DO TEMPO',
  };
}

/**
 * Weather alert component - Waze-style notification for dangerous weather conditions
 * Shows at top of screen when weather may impact travel safety
 */
export default function WeatherAlert({
  weather,
  severity,
  message,
  locationName,
  onDismiss,
  onViewDetails,
}: WeatherAlertProps) {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const config = getSeverityConfig(severity);
  const weatherIcon = getWeatherIconUrl(weather.weather[0].icon, '2x');
  const temp = Math.round(weather.main.temp);

  return (
    <Animated.View
      className="absolute top-[200px] left-4 right-4 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        transform: [{ translateY: slideAnim }],
        backgroundColor: config.color,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 50,
      }}
    >
      <View className="flex-row items-center p-4">
        {/* Alert icon with pulse animation */}
        <Animated.View
          className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mr-3"
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        >
          <Ionicons name={config.icon} size={32} color="#FFF" />
        </Animated.View>

        {/* Alert content */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-white mb-1" numberOfLines={1}>
            {config.title}
          </Text>
          <Text className="text-sm font-semibold text-white opacity-90 mb-1" numberOfLines={2}>
            {message || `${weather.weather[0].description.charAt(0).toUpperCase() + weather.weather[0].description.slice(1)}. Boas condições para viagem.`}
          </Text>
          {locationName && (
            <Text className="text-xs font-medium text-white opacity-80" numberOfLines={1}>
              📍 {locationName}
            </Text>
          )}
        </View>

        {/* Weather icon and temp */}
        <View className="items-center mr-2">
          <Image
            source={{ uri: weatherIcon }}
            style={{ width: 48, height: 48 }}
            resizeMode="contain"
          />
          <Text className="text-lg font-bold text-white -mt-1">
            {temp}°C
          </Text>
        </View>

        {/* Dismiss button */}
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom action area (optional details button) */}
      {onViewDetails && (
        <TouchableOpacity
          className="bg-white/10 py-2.5 items-center"
          onPress={() => {
            onViewDetails();
            handleDismiss();
          }}
          activeOpacity={0.7}
        >
          <Text className="text-sm font-semibold text-white">
            Ver detalhes do clima
          </Text>
        </TouchableOpacity>
      )}

      {/* Bottom accent line */}
      <View className="h-1 bg-white/30" />
    </Animated.View>
  );
}
