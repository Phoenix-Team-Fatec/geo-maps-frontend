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
      router.replace("/(tabs)/map");
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

  const gotoForgot = () =>
    router.push({ pathname: "/forgot-password", params: { email: formData.email } });

  return (
    <View className="flex-1 bg-[#0F172A]">
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Background gradiente */}
      <LinearGradient
        colors={["#0F172A", "#1E293B"]}
        style={{ ...StyleSheet.absoluteFillObject }}
      />

      <Animated.View
        className="flex-1"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Header */}
        <View className="flex-row items-center px-6 pt-[50px] pb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mr-4"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">Entrar</Text>
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
            <View className="flex-row justify-center mt-6">
              <TouchableOpacity onPress={gotoForgot} activeOpacity={0.8}>
                <Text className="text-cyan-400 text-sm font-medium">Esqueci minha senha</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row justify-center mt-6">
              <Text className="text-white/60 text-xs mr-1">
                Ainda não tem uma conta?
              </Text>
              <TouchableOpacity onPress={() => router.push("/create-profile")}>
                <Text className="text-cyan-400 text-xs font-medium">
                  Criar conta
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