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

export default function IndexScreen() {
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

  const handleLogin = () => {
    router.push("/auth/login");
  };

  const handleContinueWithoutLogin = () => {
    router.push("/main");
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View className="flex-1 bg-[#1a1a2e]">
        
        {/* Background Pattern */}
        <View className="absolute" style={{ width, height }}>
          <View 
            className="absolute w-[200px] h-[200px] rounded-[100px] bg-[#00D4FF]/5"
            style={{ top: -50, right: -50 }}
          />
          <View 
            className="absolute w-[150px] h-[150px] rounded-[75px] bg-[#00D4FF]/[0.03]"
            style={{ bottom: 100, left: -30 }}
          />
          <View 
            className="absolute w-[100px] h-[100px] rounded-[50px] bg-white/[0.02]"
            style={{ top: height * 0.3, right: 30 }}
          />
        </View>

        <Animated.View
          className="flex-1 px-6 pt-[60px] pb-10"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View className="items-center mb-[50px]">
            <View className="mb-[30px]">
              <View className="w-24 h-24 rounded-[20px] bg-white/10 justify-center items-center border border-white/15">
                <View className="w-10 h-10 rounded-[10px] bg-[#00D4FF] justify-center items-center">
                  <View className="w-3 h-3 rounded-full bg-white" />
                </View>
              </View>
            </View>

            <Text className="text-[32px] font-bold text-white text-center mb-3 tracking-wide">
              Bem-vindo ao <Text className="text-[#00D4FF]">CAR</Text>!
            </Text>
            
            <Text className="text-[16px] font-bold text-white/70 text-center leading-[22px] px-5">
              Navegue pelas propriedades rurais de forma simples
            </Text>
          </View>

          <View className="mb-[60px]">
            <View className="flex-row items-center mb-5 px-5">
              <View className="w-12 h-12 rounded-[20px] bg-[#00D4FF]/10 justify-center items-center mr-4">
                <View className="w-2 h-2 rounded-full bg-[#00D4FF]" />
              </View>
              <Text className="text-[18px] text-white/80 flex-1 font-medium">
                Endereçamento Digital de Propriedades
              </Text>
            </View>

            <View className="flex-row items-center mb-5 px-5">
              <View className="w-12 h-12 rounded-[20px] bg-[#00D4FF]/10 justify-center items-center mr-4">
                <View className="w-2 h-2 rounded-full bg-[#00D4FF]" />
              </View>
              <Text className="text-[18px] text-white/80 flex-1 font-medium">
                Gestão de Rotas Rurais
              </Text>
            </View>

            <View className="flex-row items-center mb-5 px-5">
              <View className="w-12 h-12 rounded-[20px] bg-[#00D4FF]/10 justify-center items-center mr-4">
                <View className="w-2 h-2 rounded-full bg-[#00D4FF]" />
              </View>
              <Text className="text-[18px] text-white/80 flex-1 font-medium">
                Condições das Estradas em Tempo Real
              </Text>
            </View>
          </View>

          <View className="mt-auto">
            <TouchableOpacity
              className="bg-[#03acceff] mb-4 rounded-2xl py-[18px] px-8 items-center"
              onPress={handleLogin}
              activeOpacity={0.8}
              style={{
                shadowColor: "#00D4FF",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Text className="text-white text-lg font-semibold">
                Crie sua conta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white/10 rounded-2xl py-[18px] px-8 items-center mb-5 border border-white/15"
              onPress={handleContinueWithoutLogin}
              activeOpacity={0.7}
            >
              <Text className="text-white/90 text-base font-medium">
                Continuar como visitante
              </Text>
            </TouchableOpacity>

            <Text className="text-xs text-white/50 text-center leading-4 px-5">
              Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}