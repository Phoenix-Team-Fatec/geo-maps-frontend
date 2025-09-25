import React, { useState, useRef, useEffect } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function RegisterStep2() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [formData, setFormData] = useState({
    senha: "",
    confirmarSenha: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  type FormDataKeys = keyof typeof formData;

const handleInputChange = (field: FormDataKeys, value: string) => {
  setFormData({ ...formData, [field]: value });
};

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "A senha deve conter pelo menos uma letra minúscula";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "A senha deve conter pelo menos uma letra maiúscula";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "A senha deve conter pelo menos um número";
    }
    return null;
  };

  const validateForm = () => {
    if (!formData.senha.trim()) {
      Alert.alert("Erro", "Por favor, insira sua senha");
      return false;
    }

    const passwordError = validatePassword(formData.senha);
    if (passwordError) {
      Alert.alert("Erro", passwordError);
      return false;
    }

    if (!formData.confirmarSenha.trim()) {
      Alert.alert("Erro", "Por favor, confirme sua senha");
      return false;
    }

    if (formData.senha !== formData.confirmarSenha) {
      Alert.alert("Erro", "As senhas não coincidem");
      return false;
    }

    return true;
  };

  const handleFinish = async () => {
  if (!validateForm()) return;

    setIsLoading(true);

    try {
      const userData = {
        nome: params.nome,
        sobrenome: params.sobrenome,
        data_nascimento: params.dataNascimento,
        cpf: params.cpf,
        email: params.email,
        password: formData.senha,
      };

      const response = await fetch("/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

    if (response.ok) {
      const data = await response.json();
      console.log("Usuário criado:", data);
      Alert.alert(
        "Sucesso!",
        "Conta criada com sucesso!",
        [
          { text: "OK", onPress: () => router.push("/") }
        ]
      );
    } else {
      const errorData = await response.json();
      Alert.alert(
        "Erro",
        errorData.detail || "Ocorreu um erro ao criar a conta."
      );
    }

    } catch (error) {
      console.error("Erro ao chamar API:", error);
      Alert.alert("Erro", "Ocorreu um erro na comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };


  const handleBack = () => {
    router.back();
  };

  const getPasswordStrength = () => {
    const password = formData.senha;
    if (password.length === 0) return { strength: 0, color: "transparent", text: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/(?=.*[a-z])/.test(password)) score++;
    if (/(?=.*[A-Z])/.test(password)) score++;
    if (/(?=.*\d)/.test(password)) score++;
    if (/(?=.*[@$!%*?&])/.test(password)) score++;

    if (score <= 2) return { strength: score, color: "#ff4757", text: "Fraca" };
    if (score <= 3) return { strength: score, color: "#ffa502", text: "Média" };
    return { strength: score, color: "#2ed573", text: "Forte" };
  };

  const passwordStrength = getPasswordStrength();

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
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
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
            <Text className="text-white text-xl font-semibold">
              Criar Conta - Etapa 2
            </Text>
          </View>

          {/* Welcome Section */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-[#00D4FF] justify-center items-center mb-4">
              <Text className="text-white text-3xl">🔒</Text>
            </View>
            <Text className="text-white text-2xl font-bold mb-2">
              Quase lá, {params.nome}!
            </Text>
            <Text className="text-white/70 text-base text-center px-8">
              Agora vamos criar uma senha segura para sua conta
            </Text>
          </View>

          {/* Form Fields */}
          <View className="px-6 flex-1">
            {/* Senha */}
            <View className="mb-5">
              <Text className="text-white/70 text-sm mb-2 ml-1">Senha</Text>
              <View className="relative">
                <TextInput
                  className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white text-base pr-12"
                  placeholder="Digite sua senha"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.senha}
                  onChangeText={(text) => handleInputChange("senha", text)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="absolute right-4 top-4"
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text className="text-white/60 text-lg">
                    {showPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {formData.senha.length > 0 && (
                <View className="mt-3">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white/60 text-xs">Força da senha:</Text>
                    <Text
                      className="text-xs font-medium"
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.text}
                    </Text>
                  </View>
                  <View className="flex-row space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <View
                        key={level}
                        className="flex-1 h-1 rounded-full"
                        style={{
                          backgroundColor: level <= passwordStrength.strength
                            ? passwordStrength.color
                            : 'rgba(255,255,255,0.1)'
                        }}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Confirmar Senha */}
            <View className="mb-8">
              <Text className="text-white/70 text-sm mb-2 ml-1">Confirmar Senha</Text>
              <View className="relative">
                <TextInput
                  className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white text-base pr-12"
                  placeholder="Confirme sua senha"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.confirmarSenha}
                  onChangeText={(text) => handleInputChange("confirmarSenha", text)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  className="absolute right-4 top-4"
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  activeOpacity={0.7}
                >
                  <Text className="text-white/60 text-lg">
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Password Match Indicator */}
              {formData.confirmarSenha.length > 0 && (
                <View className="mt-2">
                  <Text
                    className="text-xs ml-1"
                    style={{
                      color: formData.senha === formData.confirmarSenha
                        ? "#2ed573"
                        : "#ff4757"
                    }}
                  >
                    {formData.senha === formData.confirmarSenha
                      ? "✓ Senhas coincidem"
                      : "✗ Senhas não coincidem"}
                  </Text>
                </View>
              )}
            </View>

            {/* Password Requirements */}
            <View className="bg-white/5 rounded-2xl p-4 mb-8">
              <Text className="text-white/80 text-sm font-medium mb-3">
                Sua senha deve conter:
              </Text>
              <View className="space-y-2">
                <Text className="text-white/60 text-xs">
                  • Pelo menos 8 caracteres
                </Text>
                <Text className="text-white/60 text-xs">
                  • Uma letra maiúscula e uma minúscula
                </Text>
                <Text className="text-white/60 text-xs">
                  • Pelo menos um número
                </Text>
              </View>
            </View>

            {/* Finish Button */}
            <View className="mt-auto pb-15">
              <TouchableOpacity
                className={`rounded-2xl py-[18px] px-8 items-center ${isLoading ? 'bg-white/20' : 'bg-[#03acceff]'
                  }`}
                onPress={handleFinish}
                activeOpacity={0.8}
                disabled={isLoading}
                style={!isLoading ? {
                  shadowColor: "#00D4FF",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                } : {}}
              >
                <Text className="text-white text-lg font-semibold">
                  {isLoading ? "Criando conta..." : "Finalizar"}
                </Text>
              </TouchableOpacity>

              <Text className="text-xs text-white/50 text-center leading-4 px-5 mt-4">
                Ao criar sua conta, você concorda com nossos Termos de Serviço e Política de Privacidade
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
