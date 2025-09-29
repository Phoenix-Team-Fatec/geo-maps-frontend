import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react-native";
import { StyleSheet } from "react-native";
import { useAuth } from "../auth/AuthContext";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 380;
const isTinyDevice = width < 350;

const isSmallDevice = width < 380;
const isTinyDevice = width < 350;

export default function Login() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [formData, setFormData] = useState({ email: "", senha: "" });
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
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
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
      if (msg.toLowerCase().includes("credenciais")) {
        Alert.alert("Erro", "E-mail ou senha incorretos.");
      } else if (msg.toLowerCase().includes("servidor")) {
        Alert.alert("Erro", "Erro no servidor. Tente novamente.");
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
        <View className={`flex-row items-center ${isSmallDevice ? 'px-4' : 'px-6'} ${Platform.OS === 'ios' ? 'pt-12' : 'pt-8'} pb-6`}>
          <TouchableOpacity
            onPress={() => router.push("/")}
            className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mr-4"
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="white" />
          </TouchableOpacity>
          <Text
            className={`text-white ${isSmallDevice ? 'text-lg' : 'text-xl'} font-semibold`}
          >
            Entrar
          </Text>
        </View>

        {/* Welcome */}
        <View className={`items-center ${isSmallDevice ? 'mb-8' : 'mb-10'}`}>
          <Text
            className={`text-white ${isSmallDevice ? 'text-2xl' : 'text-3xl'} font-bold mb-2`}
          >
            Bem-vindo de volta
          </Text>
          <Text
            className={`text-white/60 ${isTinyDevice ? 'text-sm' : 'text-base'} text-center ${isSmallDevice ? 'px-4' : 'px-8'}`}
          >
            Acesse sua conta para continuar
          </Text>
        </View>

        {/* Form */}
        <View className={`${isSmallDevice ? 'px-4' : 'px-6'} flex-1`}>
          {/* Email */}
          <View className="mb-5">
            <Text
              className={`text-white/70 ${isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}

              >

              E-mail
            </Text>
            <View className="flex-row items-center bg-white/10 border border-white/15 rounded-2xl px-4">
              <Mail size={18} color="rgba(255,255,255,0.6)" />
              <TextInput
                className={`flex-1 ${isSmallDevice ? 'py-3' : 'py-4'} px-3 text-white ${isTinyDevice ? 'text-sm' : 'text-base'}`}

                    placeholder="seu@email.com"

                placeholderTextColor="rgba(255,255,255,0.4)"
                value={formData.email}
                onChangeText={(t) => handleInputChange("email", t)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>


          {/* Senha */}
          <View className="mb-6">
            <Text
              className={`text-white/70 ${isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}
              >
              Senha
            </Text>
            <View className="flex-row items-center bg-white/10 border border-white/15 rounded-2xl px-4">
              <Lock size={18} color="rgba(255,255,255,0.6)" />
              <TextInput
                className={`flex-1 ${isSmallDevice ? 'py-3' : 'py-4'} px-3 text-white ${isTinyDevice ? 'text-sm' : 'text-base'}`}
                    placeholder="Digite sua senha"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={formData.senha}
                onChangeText={(t) => handleInputChange("senha", t)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)}>
                {showPassword ? (
                  <EyeOff size={20} color="rgba(255,255,255,0.6)" />
                ) : (
                  <Eye size={20} color="rgba(255,255,255,0.6)" />
                )}
              </TouchableOpacity>

            </View>


          {/* Botão Entrar */}
          <View className={`mt-auto ${Platform.OS === 'ios' ? 'pb-8' : 'pb-6'}`}>
            <TouchableOpacity
              className="rounded-2xl overflow-hidden"
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isLoading ? ["#475569", "#475569"] : ["#06b6d4", "#3b82f6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: isSmallDevice ? 16 : 20,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: isSmallDevice ? 56 : 64,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    className={`text-white ${isTinyDevice ? 'text-base' : 'text-lg'} font-semibold`}
                    style={{
                      textAlign: 'center'
                    }}
                  >
                    Entrar
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text
              className={`${isTinyDevice ? 'text-2xs' : 'text-xs'} text-white/50 text-center leading-4 ${isSmallDevice ? 'px-3' : 'px-5'} mt-4`}
              >
              Ao entrar, você concorda com nossos Termos de Serviço e Política de
              Privacidade
            </Text>

            <View className="flex-row justify-center mt-6">
              <Text
                className={`text-white/60 ${isTinyDevice ? 'text-2xs' : 'text-xs'} mr-1`}
                  >
                Ainda não tem uma conta?
              </Text>
              <TouchableOpacity onPress={() => router.push("/create-profile")}>
                <Text
                  className={`text-cyan-400 ${isTinyDevice ? 'text-2xs' : 'text-xs'} font-medium`}
                      >
                  Criar conta

                </Text>
                <TouchableOpacity onPress={() => router.push("/create-profile")}>
                  <Text
                    className={`text-cyan-400 ${isTinyDevice ? 'text-2xs' : 'text-xs'} font-medium`}
                  >
                    Criar conta
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
