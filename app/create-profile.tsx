import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  ScrollView,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";

// Constants
const { width, height } = Dimensions.get("window");
const DEVICE_CONFIG = {
  isSmallDevice: width < 380,
  isTinyDevice: width < 350,
  isIOS: Platform.OS === 'ios',
};

// Form field configuration
const FORM_FIELDS = {
  nome: { label: "Nome", placeholder: "Digite seu nome", keyboardType: "default", autoCapitalize: "words" },
  sobrenome: { label: "Sobrenome", placeholder: "Digite seu sobrenome", keyboardType: "default", autoCapitalize: "words" },
  email: { label: "Email", placeholder: "Digite seu email", keyboardType: "email-address", autoCapitalize: "none" },
  dataNascimento: { label: "Data de Nascimento", placeholder: "DD/MM/AAAA", keyboardType: "numeric", maxLength: 10, icon: "📅" },
  cpf: { label: "CPF", placeholder: "000.000.000-00", keyboardType: "numeric", maxLength: 14, icon: "📄" },
} as const;

// Types
interface FormData {
  nome: string;
  sobrenome: string;
  email: string;
  dataNascimento: string;
  cpf: string;
}

type FormField = keyof FormData;

// Utility functions
const formatters = {
  cpf: (text: string): string => {
    const numbers = text.replace(/\D/g, "").slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  },

  date: (text: string): string => {
    const numbers = text.replace(/\D/g, "").slice(0, 8);
    return numbers
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})(\d)/, "$1/$2");
  }
};

const validators = {
  cpf: (raw: string): boolean => {
    if (!raw) return false;
    const cpf = raw.replace(/\D/g, "");
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const calc = (base: string, fatorIni: number) => {
      let soma = 0;
      for (let i = 0; i < base.length; i++) {
        soma += parseInt(base[i], 10) * (fatorIni - i);
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };

    const d1 = calc(cpf.slice(0, 9), 10);
    const d2 = calc(cpf.slice(0, 9) + d1, 11);
    return cpf.endsWith(`${d1}${d2}`);
  },

  email: (email: string): boolean => /\S+@\S+\.\S+/.test(email),

  date: (date: string): boolean => date.length === 10,

  required: (value: string): boolean => value.trim().length > 0
};

// Custom hooks
const useKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });
    
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

const useAnimation = () => {
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

  return { fadeAnim, slideAnim };
};

// Components
const BackgroundPattern = React.memo(() => (
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
));

const Header = React.memo(({ onBack }: { onBack: () => void }) => (
  <View className={`flex-row items-center ${DEVICE_CONFIG.isSmallDevice ? 'px-4' : 'px-6'} ${DEVICE_CONFIG.isIOS ? 'pt-12' : 'pt-8'} pb-4`}>
    <TouchableOpacity
      onPress={onBack}
      className="w-10 h-10 rounded-full bg-white/10 justify-center items-center mr-4"
      activeOpacity={0.7}
    >
      <Text className="text-white text-lg">←</Text>
    </TouchableOpacity>
    <Text className={`text-white ${DEVICE_CONFIG.isSmallDevice ? 'text-lg' : 'text-xl'} font-semibold`}>
      Criar Conta - Etapa 1
    </Text>
  </View>
));

const Avatar = React.memo(() => (
  <View className="items-center mb-6">
    <TouchableOpacity className="w-24 h-24 rounded-full bg-white/10 justify-center items-center border-2 border-white/15 mb-4">
      <View className="w-12 h-12 rounded-full bg-[#00D4FF] justify-center items-center">
        <Text className="text-white text-xl font-bold">👤</Text>
      </View>
      <View className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#00D4FF] justify-center items-center">
        <Text className="text-white text-sm">✎</Text>
      </View>
    </TouchableOpacity>
  </View>
));

interface FormFieldProps {
  field: FormField;
  value: string;
  onChangeText: (field: FormField, value: string) => void;
  onFocus: (field: FormField) => void;
}

const FormField = React.memo(({ field, value, onChangeText, onFocus }: FormFieldProps) => {
  const config = FORM_FIELDS[field];
  
  return (
    <View className="mb-4">
      <Text className={`text-white/70 ${DEVICE_CONFIG.isTinyDevice ? 'text-xs' : 'text-sm'} mb-2 ml-1`}>
        {config.label}
      </Text>
      <View className="relative">
        <TextInput
          className={`bg-white/10 border border-white/15 rounded-2xl px-4 ${DEVICE_CONFIG.isSmallDevice ? 'py-3' : 'py-4'} text-white ${DEVICE_CONFIG.isTinyDevice ? 'text-sm' : 'text-base'} ${config.icon ? 'pr-12' : ''}`}
          placeholder={config.placeholder}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={value}
          onChangeText={(text) => onChangeText(field, text)}
          onFocus={() => onFocus(field)}
          keyboardType={config.keyboardType as any}
          autoCapitalize={config.autoCapitalize as any}
          maxLength={config.maxLength}
          returnKeyType="next"
        />
        {config.icon && (
          <View className="absolute right-4 top-4">
            <Text className="text-white/40 text-lg">{config.icon}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const NextButton = React.memo(({ onPress }: { onPress: () => void }) => (
  <View className="mt-auto pb-8">
    <TouchableOpacity
      className={`bg-[#03acceff] rounded-2xl ${DEVICE_CONFIG.isSmallDevice ? 'py-4' : 'py-[18px]'} px-8 items-center`}
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        shadowColor: "#00D4FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        minHeight: DEVICE_CONFIG.isSmallDevice ? 48 : 54,
      }}
    >
      <Text className={`text-white ${DEVICE_CONFIG.isTinyDevice ? 'text-base' : 'text-lg'} font-semibold`}>
        Próximo
      </Text>
    </TouchableOpacity>
  </View>
));

export default function RegisterStep1() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const { fadeAnim, slideAnim } = useAnimation();
  
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    sobrenome: "",
    email: "",
    dataNascimento: "",
    cpf: "",
  });

  const handleInputChange = useCallback((field: FormField, value: string) => {
    let formattedValue = value;
    
    if (field === "cpf") {
      formattedValue = formatters.cpf(value);
    } else if (field === "dataNascimento") {
      formattedValue = formatters.date(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  }, []);

  const handleInputFocus = useCallback((field: FormField) => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        const scrollPositions: Record<FormField, number> = {
          nome: 0,
          sobrenome: 50,
          email: 200,
          dataNascimento: 300,
          cpf: 400,
        };
        
        if (field === 'dataNascimento' || field === 'cpf') {
          scrollViewRef.current.scrollToEnd({ animated: true });
        } else {
          scrollViewRef.current.scrollTo({ y: scrollPositions[field], animated: true });
        }
      }
    }, 300);  
  }, []);

  const validateForm = useCallback((): boolean => {
    const validations = [
      { condition: !validators.required(formData.nome), message: "Por favor, insira seu nome" },
      { condition: !validators.required(formData.sobrenome), message: "Por favor, insira seu sobrenome" },
      { condition: !validators.required(formData.email) || !validators.email(formData.email), message: "Por favor, insira um e-mail válido" },
      { condition: !validators.required(formData.dataNascimento) || !validators.date(formData.dataNascimento), message: "Por favor, insira uma data de nascimento válida" },
      { condition: !validators.required(formData.cpf) || formData.cpf.length !== 14 || !validators.cpf(formData.cpf), message: "Por favor, insira um CPF válido" },
    ];

    for (const validation of validations) {
      if (validation.condition) {
        Alert.alert("Erro", validation.message);
        return false;
      }
    }

    return true;
  }, [formData]);

  const formatDateForSubmission = useCallback((date: string): string => {
    const parts = date.split("/");
    if (parts.length !== 3) return date;
    
    const [dia, mes, ano] = parts;
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }, []);

  const handleNext = useCallback(() => {
    if (validateForm()) {
      const payload = {
        ...formData,
        dataNascimento: formatDateForSubmission(formData.dataNascimento),
      };

      router.push({
        pathname: "/create-account",
        params: payload,
      });
    }
  }, [formData, validateForm, formatDateForSubmission, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const contentContainerStyle = useMemo(() => ({
    flexGrow: 1,
    paddingBottom: isKeyboardVisible ? 100 : 20
  }), [isKeyboardVisible]);

  const mainContentStyle = useMemo(() => ({
    paddingBottom: isKeyboardVisible 
      ? keyboardHeight - (DEVICE_CONFIG.isIOS ? 34 : 0) 
      : 0
  }), [isKeyboardVisible, keyboardHeight]);

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View className="flex-1 bg-[#1a1a2e]">
        <BackgroundPattern />

        <Animated.View
          className="flex-1"
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Header onBack={handleBack} />

          <View className="flex-1" style={mainContentStyle}>
            <ScrollView 
              ref={scrollViewRef}
              className="flex-1"
              contentContainerStyle={contentContainerStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!isKeyboardVisible && <Avatar />}

              <View className={`${DEVICE_CONFIG.isSmallDevice ? 'px-4' : 'px-6'} flex-1`}>
                {(Object.keys(FORM_FIELDS) as FormField[]).map((field) => (
                  <FormField
                    key={field}
                    field={field}
                    value={formData[field]}
                    onChangeText={handleInputChange}
                    onFocus={handleInputFocus}
                  />
                ))}

                {!isKeyboardVisible && <NextButton onPress={handleNext} />}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}