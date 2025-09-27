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
  Platform,
} from "react-native";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");
const isSmallDevice = width < 380;
const isTinyDevice = width < 350;

export default function RegisterStep1() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [formData, setFormData] = useState({
    nome: "",
    sobrenome: "",
    email: "",
    dataNascimento: "",
    cpf: "",
  });

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

  const formatCPF = (text: string): string => {
    const numbers = text.replace(/\D/g, "");

    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    return numbers.slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{2})$/, "$1-$2");
  };

  const formatDate = (text: string): string => {
    const numbers = text.replace(/\D/g, "");

    if (numbers.length <= 8) {
      return numbers
        .replace(/(\d{2})(\d)/, "$1/$2")
        .replace(/(\d{2})(\d)/, "$1/$2");
    }

    return numbers.slice(0, 8)
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2");
  };

  const handleInputChange = (field: "nome" | "sobrenome" | "email" | "dataNascimento" | "cpf", value: string) => {
    if (field === "cpf") {
      setFormData({ ...formData, [field]: formatCPF(value) });
    } else if (field === "dataNascimento") {
      setFormData({ ...formData, [field]: formatDate(value) });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  function isValidCPF(raw: string): boolean {
    if (!raw) return false;
    const cpf = raw.replace(/\D/g, "");
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calc = (base: string, fatorIni: number) => {
      let soma = 0;
      for (let i = 0; i < base.length; i++) soma += parseInt(base[i], 10) * (fatorIni - i);
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };

    const d1 = calc(cpf.slice(0, 9), 10);
    const d2 = calc(cpf.slice(0, 9) + d1, 11);
    return cpf.endsWith(`${d1}${d2}`);
  }


  const validateForm = () => {
    if (!formData.nome.trim()) {
      Alert.alert("Erro", "Por favor, insira seu nome");
      return false;
    }
    if (!formData.sobrenome.trim()) {
      Alert.alert("Erro", "Por favor, insira seu sobrenome");
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert("Erro", "Por favor, insira um e-mail válido");
      return false;
    }
    if (!formData.dataNascimento.trim() || formData.dataNascimento.length !== 10) {
      Alert.alert("Erro", "Por favor, insira uma data de nascimento válida");
      return false;
    }
    if (!formData.cpf.trim() || formData.cpf.length !== 14 || !isValidCPF(formData.cpf)) {
      Alert.alert("Erro", "Por favor, insira um CPF válido");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateForm()) {
      const parts = formData.dataNascimento.split("/");
      if (parts.length !== 3) {
        Alert.alert("Erro", "Data de nascimento inválida");
        return;
      }

      const [dia, mes, ano] = parts;
      const diaFormatado = dia.padStart(2, "0");
      const mesFormatado = mes.padStart(2, "0");
      const dataFormatada = `${ano}-${mesFormatado}-${diaFormatado}`;

      const payload = {
        ...formData,
        dataNascimento: dataFormatada,
      };

      router.push({
        pathname: "/create-account",
        params: payload,
      });
    }
  };


  const handleBack = () => {
    router.back();
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
          className="flex-1"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <View className={`flex-row items-center ${isSmallDevice ? 'px-4' : 'px-6'} ${Platform.OS === 'ios' ? 'pt-12' : 'pt-8'} pb-6`}>
            <TouchableOpacity
              onPress={handleBack}
              className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mr-4"
              activeOpacity={0.7}
            >
              <Text className="text-white text-lg">←</Text>
            </TouchableOpacity>
            <Text
              className={`text-white ${isSmallDevice ? 'text-lg' : 'text-xl'} font-semibold`}
            >
              Criar Conta - Etapa 1
            </Text>
          </View>

          {/* Avatar Section */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-white/10 justify-center items-center border-2 border-white/15 mb-4">
              <View className="w-12 h-12 rounded-full bg-[#00D4FF] justify-center items-center">
                <Text className="text-white text-xl font-bold">👤</Text>
              </View>
              <TouchableOpacity className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#00D4FF] justify-center items-center">
                <Text className="text-white text-sm">✎</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View className={`${isSmallDevice ? 'px-4' : 'px-6'} flex-1`}>
            {/* Nome */}
            <View className="mb-5">
              <Text
                className={`text-white/70 ${isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}
              >
                Nome
              </Text>
              <TextInput
                className={`bg-white/10 border border-white/15 rounded-2xl px-4 ${isSmallDevice ? 'py-3' : 'py-4'} text-white ${isTinyDevice ? 'text-sm' : 'text-base'}`}
                placeholder="Digite seu nome"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={formData.nome}
                onChangeText={(text) => handleInputChange("nome", text)}
                autoCapitalize="words"
              />
            </View>

            {/* Sobrenome */}
            <View className="mb-5">
              <Text
                className={`text-white/70 ${isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}
              >
                Sobrenome
              </Text>
              <TextInput
                className={`bg-white/10 border border-white/15 rounded-2xl px-4 ${isSmallDevice ? 'py-3' : 'py-4'} text-white ${isTinyDevice ? 'text-sm' : 'text-base'}`}
                placeholder="Digite seu sobrenome"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={formData.sobrenome}
                onChangeText={(text) => handleInputChange("sobrenome", text)}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View className="mb-5">
              <Text
                className={`text-white/70 ${isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}
              >
                Email
              </Text>
              <TextInput
                className={`bg-white/10 border border-white/15 rounded-2xl px-4 ${isSmallDevice ? 'py-3' : 'py-4'} text-white ${isTinyDevice ? 'text-sm' : 'text-base'}`}
                placeholder="Digite seu email"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={formData.email}
                onChangeText={(text) => handleInputChange("email", text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Data de Nascimento */}
            <View className="mb-5">
              <Text
                className={`text-white/70 ${isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}
              >
                Data de Nascimento
              </Text>
              <View className="relative">
                <TextInput
                  className={`bg-white/10 border border-white/15 rounded-2xl px-4 ${isSmallDevice ? 'py-3' : 'py-4'} text-white ${isTinyDevice ? 'text-sm' : 'text-base'} pr-12`}
                    placeholder="DD/MM/AAAA"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.dataNascimento}
                  onChangeText={(text) => handleInputChange("dataNascimento", text)}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <View className="absolute right-4 top-4">
                  <Text className="text-white/40 text-lg">📅</Text>
                </View>
              </View>
            </View>

            {/* CPF */}
            <View className="mb-8">
              <Text
                className={`text-white/70 ${isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}
              >
                CPF
              </Text>
              <View className="relative">
                <TextInput
                  className={`bg-white/10 border border-white/15 rounded-2xl px-4 ${isSmallDevice ? 'py-3' : 'py-4'} text-white ${isTinyDevice ? 'text-sm' : 'text-base'} pr-12`}
                    placeholder="000.000.000-00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.cpf}
                  onChangeText={(text) => handleInputChange("cpf", text)}
                  keyboardType="numeric"
                  maxLength={14}
                />
                <View className="absolute right-4 top-4">
                  <Text className="text-white/40 text-lg">📄</Text>
                </View>
              </View>
            </View>

            {/* Next Button */}
            <View className={`mt-auto ${Platform.OS === 'ios' ? 'pb-8' : 'pb-6'}`}>
              <TouchableOpacity
                className={`bg-[#03acceff] rounded-2xl ${isSmallDevice ? 'py-4' : 'py-[18px]'} px-8 items-center`}
                onPress={handleNext}
                activeOpacity={0.8}
                style={{
                  shadowColor: "#00D4FF",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 8,
                  minHeight: isSmallDevice ? 48 : 54,
                }}
              >
                <Text
                  className={`text-white ${isTinyDevice ? 'text-base' : 'text-lg'} font-semibold`}
                    >
                  Próximo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
