import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Occurrence } from '@/services/occurrence-client';

interface ProximityAlertProps {
  occurrence: Occurrence;
  distance: number;
  onDismiss: () => void;
}

/**
 * Get icon name based on occurrence type
 */
function getOccurrenceIcon(type: string): keyof typeof Ionicons.glyphMap {
  const typeMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
    'trânsito': 'car',
    'acidente': 'warning',
    'veículo parado': 'alert-circle',
    'veículo no acostamento': 'alert-circle',
    'polícia': 'shield',
    'polícia rodoviária': 'shield',
  };
  return typeMap[type.toLowerCase()] || 'information-circle';
}

/**
 * Get color based on severity
 */
function getSeverityColor(severity: string): string {
  const colorMap: { [key: string]: string } = {
    'leve': '#00D4FF',
    'moderada': '#ffb703',
    'intensa': '#ff006e',
  };
  return colorMap[severity.toLowerCase()] || '#00D4FF';
}

/**
 * Format distance for display
 */
function formatDistance(meters: number): string {
  if (meters < 100) {
    return `${Math.round(meters / 10) * 10}m à frente`;
  } else if (meters < 1000) {
    return `${Math.round(meters / 50) * 50}m à frente`;
  } else {
    return `${(meters / 1000).toFixed(1)}km à frente`;
  }
}

/**
 * Waze-style proximity alert component
 * Appears at the top of the screen when user approaches an occurrence
 */
export default function ProximityAlert({ occurrence, distance, onDismiss }: ProximityAlertProps) {
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
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
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

  const severityColor = getSeverityColor(occurrence.gravidade);
  const icon = getOccurrenceIcon(occurrence.tipo);

  return (
    <Animated.View
      className="absolute top-[170px] left-4 right-4 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        transform: [{ translateY: slideAnim }],
        backgroundColor: severityColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 5,
      }}
    >
      <TouchableOpacity
        className="flex-row items-center p-4"
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        {/* Icon with pulse animation */}
        <Animated.View
          className="w-14 h-14 rounded-full bg-white/20 items-center justify-center mr-3"
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        >
          <Ionicons name={icon} size={32} color="#FFF" />
        </Animated.View>

        {/* Alert content */}
        <View className="flex-1">
          <Text className="text-lg font-bold text-white mb-0.5" numberOfLines={1}>
            {occurrence.tipo.toUpperCase()}
          </Text>
          <Text className="text-base font-semibold text-white opacity-90 mb-0.5">
            {formatDistance(distance)}
          </Text>
          <Text className="text-xs font-medium text-white opacity-80">
            Gravidade: {occurrence.gravidade}
          </Text>
        </View>

        {/* Dismiss button */}
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-white/20 items-center justify-center ml-2"
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Bottom accent line */}
      <View className="h-1 bg-white/30" />
    </Animated.View>
  );
}
