import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchWeather,
  WeatherData,
  formatTemperature,
  getWeatherIconUrl,
  getWeatherDescriptionPT,
  getWeatherAlertMessage,
  formatWindSpeed,
  getWindDirection,
} from '@/services/weather-api';

interface WeatherWidgetProps {
  latitude: number;
  longitude: number;
  compact?: boolean;
}

/**
 * Weather widget component
 * Displays current weather information for a location
 */
export default function WeatherWidget({ latitude, longitude, compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeather();
    // Refresh weather every 10 minutes
    const interval = setInterval(loadWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const loadWeather = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWeather(latitude, longitude);
      setWeather(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar clima');
      console.error('Weather error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="bg-white/10 rounded-2xl p-4 items-center justify-center">
        <ActivityIndicator color="#00D4FF" />
        <Text className="text-white text-xs mt-2">Carregando clima...</Text>
      </View>
    );
  }

  if (error || !weather) {
    return (
      <View className="bg-red-500/20 rounded-2xl p-4">
        <Text className="text-red-100 text-sm">
          {error || 'Dados do clima indisponíveis'}
        </Text>
      </View>
    );
  }

  const alertMessage = getWeatherAlertMessage(weather);
  const condition = weather.weather[0];
  const iconUrl = getWeatherIconUrl(condition.icon);

  if (compact) {
    return (
      <View className="bg-white/10 rounded-xl px-3 py-2 flex-row items-center">
        <Image
          source={{ uri: iconUrl }}
          className="w-10 h-10"
          resizeMode="contain"
        />
        <Text className="text-white text-lg font-bold ml-2">
          {formatTemperature(weather.main.temp)}
        </Text>
        <Text className="text-white/70 text-sm ml-2">
          {getWeatherDescriptionPT(condition.description)}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-4 shadow-xl">
      {/* Alert message */}
      {alertMessage && (
        <View className="bg-red-500/80 rounded-xl p-3 mb-3">
          <Text className="text-white font-semibold text-sm">
            {alertMessage}
          </Text>
        </View>
      )}

      {/* Main weather info */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1">
          <Text className="text-white text-4xl font-bold">
            {formatTemperature(weather.main.temp)}
          </Text>
          <Text className="text-white/90 text-base mt-1 capitalize">
            {getWeatherDescriptionPT(condition.description)}
          </Text>
          <Text className="text-white/70 text-sm">
            Sensação: {formatTemperature(weather.main.feels_like)}
          </Text>
        </View>

        <Image
          source={{ uri: iconUrl }}
          className="w-24 h-24"
          resizeMode="contain"
        />
      </View>

      {/* Additional details */}
      <View className="bg-white/10 rounded-xl p-3">
        <View className="flex-row justify-between mb-2">
          <View className="flex-row items-center">
            <Ionicons name="water" size={16} color="rgba(255,255,255,0.8)" />
            <Text className="text-white/80 text-sm ml-2">
              Umidade: {weather.main.humidity}%
            </Text>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="speedometer" size={16} color="rgba(255,255,255,0.8)" />
            <Text className="text-white/80 text-sm ml-2">
              {weather.main.pressure} hPa
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="flag" size={16} color="rgba(255,255,255,0.8)" />
          <Text className="text-white/80 text-sm ml-2">
            Vento: {formatWindSpeed(weather.wind.speed)} {getWindDirection(weather.wind.deg)}
          </Text>
        </View>
      </View>

      {/* Location */}
      <Text className="text-white/60 text-xs mt-3 text-center">
        {weather.name}, {weather.sys.country}
      </Text>
    </View>
  );
}
