// app/reset-password.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StatusBar, Animated, Dimensions, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function ResetPassword() {
  const { email, code } = useLocalSearchParams<{ email: string; code: string }>();
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const validatePassword = (p: string) => {
    if (p.length < 8) return "A senha deve ter pelo menos 8 caracteres";
    if (!/(?=.*[a-z])/.test(p)) return "Inclua pelo menos uma letra minúscula";
    if (!/(?=.*[A-Z])/.test(p)) return "Inclua pelo menos uma letra maiúscula";
    if (!/(?=.*\d)/.test(p)) return "Inclua pelo menos um número";
    return null;
  };

  const submit = async () => {
    if (!senha.trim() || !confirmar.trim()) {
      Alert.alert("Erro", "Preencha a nova senha e a confirmação.");
      return;
    }
    const err = validatePassword(senha);
    if (err) {
      Alert.alert("Erro", err);
      return;
    }
    if (senha !== confirmar) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);
      const r = await fetch("/auth/password/reset", {
        method: "POST",
        body: JSON.stringify({ email, code, new_password: senha }),
      });
      if (!r.ok && r.status !== 204) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.detail || "Não foi possível redefinir a senha");
      }
      Alert.alert("Tudo certo!", "Sua senha foi alterada com sucesso.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (e: any) {
      Alert.alert("Ops", e?.message ?? "Falha ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#1a1a2e]">
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <View className="absolute" style={{ width, height }}>
        <View className="absolute w-[200px] h-[200px] rounded-[100px] bg-[#00D4FF]/5" style={{ top: -50, right: -50 }} />
      </View>

      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }} className="flex-1 px-6 pt-[50px]">
        <Text className="text-white text-xl font-semibold mb-8">Definir nova senha</Text>

        <Text className="text-white/70 mb-6">E-mail: <Text className="text-white">{email}</Text></Text>

        {/* senha */}
        <View className="mb-5">
          <Text className="text-white/70 text-sm mb-2 ml-1">Nova senha</Text>
          <View className="relative">
            <TextInput
              className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white text-base pr-12"
              placeholder="Sua nova senha"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!show1}
              autoCapitalize="none"
            />
            <TouchableOpacity className="absolute right-4 top-4" onPress={() => setShow1((v) => !v)} activeOpacity={0.7}>
              <Text className="text-white/70 text-lg">{show1 ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* confirmar */}
        <View className="mb-8">
          <Text className="text-white/70 text-sm mb-2 ml-1">Confirmar senha</Text>
          <View className="relative">
            <TextInput
              className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white text-base pr-12"
              placeholder="Repita a nova senha"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry={!show2}
              autoCapitalize="none"
            />
            <TouchableOpacity className="absolute right-4 top-4" onPress={() => setShow2((v) => !v)} activeOpacity={0.7}>
              <Text className="text-white/70 text-lg">{show2 ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          {confirmar.length > 0 && (
            <Text className="text-xs ml-1 mt-2" style={{ color: senha === confirmar ? "#2ed573" : "#ff4757" }}>
              {senha === confirmar ? "✓ Senhas coincidem" : "✗ Senhas não coincidem"}
            </Text>
          )}
        </View>

        <TouchableOpacity
          className={`rounded-2xl py-[18px] items-center ${loading ? "bg-[#00D4FF]/60" : "bg-[#03acceff]"}`}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text className="text-white text-lg font-semibold">{loading ? "Salvando..." : "Salvar nova senha"}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}