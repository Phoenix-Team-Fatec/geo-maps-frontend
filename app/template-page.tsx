
{/* TELA DE PLACE HOLDER PARA A TELA INICIAL, PODE SER UMSADO COMO TEMPLATE PARA AS OUTRAS TELAS DO APP */ }

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function BlankPageTemplate() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View className="flex-1 bg-[#1a1a2e]">


        <Animated.View
          className="flex-1"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header (Optional) */}
          <View className="px-6 pt-[50px] pb-6">
            <Text className="text-white text-2xl font-bold">
              Page Title
            </Text>
          </View>

          {/* Main Content Area */}
          <View className="flex-1 px-6">
            {/* ADD YOUR CONTENT HERE */}
            <View className="flex-1 justify-center items-center">
              <Text className="text-white/70 text-lg text-center">
                Your content goes here
              </Text>
            </View>
          </View>

          {/* Bottom Navigation */}
          <View className="bg-black/20 border-t border-white/10 pb-15">
            <View className="flex-row justify-around py-3 px-4">

              {/* Home */}
              <TouchableOpacity
                className="items-center justify-center flex-1 py-2"
                activeOpacity={0.7}
                onPress={() => router.push("/main" as any)}
              >
                <View className="w-6 h-6 mb-1">
                  <Text className="text-[#00D4FF] text-xl text-center">🏠</Text>
                </View>
                <Text className="text-[#00D4FF] text-xs font-medium">Início</Text>
              </TouchableOpacity>

              {/* Search */}
              <TouchableOpacity
                className="items-center justify-center flex-1 py-2"
                activeOpacity={0.7}
                onPress={() => router.push("/search" as any)}
              >
                <View className="w-6 h-6 mb-1">
                  <Text className="text-white/60 text-xl text-center">🔍</Text>
                </View>
                <Text className="text-white/60 text-xs">Buscar</Text>
              </TouchableOpacity>

              {/* Map */}
              <TouchableOpacity
                className="items-center justify-center flex-1 py-2"
                activeOpacity={0.7}
                onPress={() => router.push("/map")}
              >
                <View className="w-6 h-6 mb-1">
                  <Text className="text-white/60 text-xl text-center">🗺️</Text>
                </View>
                <Text className="text-white/60 text-xs">Mapa</Text>
              </TouchableOpacity>

              {/* Profile */}
              <TouchableOpacity
                className="items-center justify-center flex-1 py-2"
                activeOpacity={0.7}
                onPress={() => router.push("/profile")}
              >
                <View className="w-6 h-6 mb-1">
                  <Text className="text-white/60 text-xl text-center">👤</Text>
                </View>
                <Text className="text-white/60 text-xs">Perfil</Text>
              </TouchableOpacity>

            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}