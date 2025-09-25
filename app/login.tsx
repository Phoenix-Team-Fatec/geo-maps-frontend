import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../auth/AuthContext";


const { width, height } = Dimensions.get("window");

export default function Login() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [formData, setFormData] = useState({
    email: "",
    senha: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  type FormDataKeys = keyof typeof formData;

  const handleInputChange = (field: FormDataKeys, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const validateForm = () => {
    if (!formData.email.trim()) {
      Alert.alert("Erro", "Por favor, insira seu e-mail");
      return false;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    if (!emailOk) {
      Alert.alert("Erro", "Insira um e-mail válido");
      return false;
    }
    if (!formData.senha.trim()) {
      Alert.alert("Erro", "Por favor, insira sua senha");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      await login(formData.email, formData.senha);
      router.replace("/template-page")
    } catch (e: any) {
      const msg = String(e?.message || e);
      // mensagens amigáveis
      if (msg.toLowerCase().includes("credenciais")) {
        Alert.alert("Erro", "E-mail ou senha incorretos.");
      } else if (msg.toLowerCase().includes("servidor")) {
        Alert.alert("Erro", "Erro no servidor. Tente novamente em instantes.");
      } else {
        Alert.alert("Erro", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => router.back();

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
          className="flex-1"
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* Header */}
          <View className="flex-row items-center px-6 pt-[50px] pb-8">
            <TouchableOpacity
              onPress={handleBack}
              className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mr-4"
              activeOpacity={0.7}
            >
              <Text className="text-white text-lg">←</Text>
            </TouchableOpacity>
            <Text className="text-white text-xl font-semibold">Entrar</Text>
          </View>

          {/* Welcome */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-[#00D4FF] justify-center items-center mb-4">
              <Text className="text-white text-3xl">👋</Text>
            </View>
            <Text className="text-white text-2xl font-bold mb-2">
              Bem-vindo de volta!
            </Text>
            <Text className="text-white/70 text-base text-center px-8">
              Acesse sua conta para continuar
            </Text>
          </View>

          {/* Form */}
          <View className="px-6 flex-1">
            {/* Email */}
            <View className="mb-5">
              <Text className="text-white/70 text-sm mb-2 ml-1">E-mail</Text>
              <View className="relative">
                <TextInput
                  className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white text-base pr-12"
                  placeholder="seu@email.com"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.email}
                  onChangeText={(t) => handleInputChange("email", t)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View className="absolute right-4 top-4">
                  <Text className="text-white/60 text-lg">✉️</Text>
                </View>
              </View>
            </View>

            {/* Senha */}
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2 ml-1">Senha</Text>
              <View className="relative">
                <TextInput
                  className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white text-base pr-12"
                  placeholder="Digite sua senha"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.senha}
                  onChangeText={(t) => handleInputChange("senha", t)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="absolute right-4 top-4"
                  onPress={() => setShowPassword((s) => !s)}
                  activeOpacity={0.7}
                >
                  <Text className="text-white/60 text-lg">
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botão Entrar */}
            <View className="mt-auto pb-15">
              <TouchableOpacity
                className={`rounded-2xl py-[18px] px-8 items-center ${isLoading ? "bg-white/20" : "bg-[#03acceff]"
                  }`}
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={isLoading}
                style={
                  !isLoading
                    ? {
                      shadowColor: "#00D4FF",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 8,
                    }
                    : {}
                }
              >
                <Text className="text-white text-lg font-semibold">
                  {isLoading ? "Entrando..." : "Entrar"}
                </Text>
              </TouchableOpacity>

              <Text className="text-xs text-white/50 text-center leading-4 px-5 mt-4">
                Ao entrar, você concorda com nossos Termos de Serviço e Política de
                Privacidade
              </Text>

              <View className="flex-row justify-center mt-6">
                <Text className="text-white/60 text-xs mr-1">
                  Ainda não tem uma conta?
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push("/create-profile")}
                >
                  <Text className="text-[#00D4FF] text-xs font-medium">
                    Criar conta
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}