import React, { useEffect, useRef } from 'react';
import { View, Text, StatusBar, Animated } from 'react-native';

const SplashScreen = () => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoScale, logoOpacity, textOpacity]);

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View className="flex-1 bg-[#1a1a2e]">
        <View className="flex-1 justify-center items-center px-5">

          <Animated.View 
            className="mb-10"
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          >
            <View className="w-[120px] h-[120px] rounded-[30px] bg-white/10 justify-center items-center border border-white/20">
              <View className="w-[60px] h-[60px] rounded-[15px] bg-[#00D4FF] justify-center items-center">
                <View 
                  className="w-5 h-5 rounded-full bg-white" 
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 5,
                  }}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View 
            className="items-center"
            style={{ opacity: textOpacity }}
          >
            <Text className="text-white text-[32px] font-bold mb-2 text-center tracking-wide">
              Cadastro Ambiental Rural
            </Text>
            
            <Text className="text-white/80 text-base text-center mb-8 font-normal">
              Endereçamento digital e rotas rurais
            </Text>
            
            <View className="flex-row justify-center items-center">
              <View className="w-2 h-2 rounded-full bg-[#00D4FF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#00D4FF] mx-1" />
              <View className="w-2 h-2 rounded-full bg-[#00D4FF] mx-1" />
            </View>
          </Animated.View>
          
        </View>
      </View>
    </View>
  );
};

export default SplashScreen;