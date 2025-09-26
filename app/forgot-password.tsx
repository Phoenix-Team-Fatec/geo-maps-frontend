// app/forgot-password.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StatusBar, Animated, Dimensions, Alert } from "react-native";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function ForgotPassword() {
    const router = useRouter();
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(40)).current;
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    function isEmail(v: string) {
        return /\S+@\S+\.\S+/.test(v.trim());
    }

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start();
    }, []);

    const submit = async () => {
        if (!isEmail(email)) {
            Alert.alert("Erro", "Informe um e-mail válido");
            return;
        }
        try {
            setLoading(true);
            const r = await fetch("/auth/password/forgot", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            // backend sempre retorna 204, mesmo se e-mail não existir
            if (!r.ok && r.status !== 204) {
                const data = await r.json().catch(() => ({}));
                throw new Error(data?.detail || "Falha ao solicitar código");
            }
            router.push({ pathname: "/verify-code", params: { email } });
        } catch (e: any) {
            Alert.alert("Ops", e?.message ?? "Não foi possível enviar o código.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#1a1a2e]">
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
            {/* bg */}
            <View className="absolute" style={{ width, height }}>
                <View className="absolute w-[200px] h-[200px] rounded-[100px] bg-[#00D4FF]/5" style={{ top: -50, right: -50 }} />
                <View className="absolute w-[150px] h-[150px] rounded-[75px] bg-[#00D4FF]/[0.03]" style={{ bottom: 100, left: -30 }} />
            </View>

            <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }} className="flex-1 px-6 pt-[50px]">
                <Text className="text-white text-xl font-semibold mb-8">Recuperar senha</Text>

                <View className="items-center mb-8">
                    <View className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/15 justify-center items-center">
                        <Text className="text-white text-2xl">✉️</Text>
                    </View>
                    <Text className="text-white/70 mt-3 text-center">
                        Informe seu e-mail. Enviaremos um código de 6 dígitos.
                    </Text>
                </View>

                <View>
                    <Text className="text-white/70 text-sm mb-2 ml-1">Email</Text>
                    <TextInput
                        className="bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white text-base"
                        placeholder="seu@email.com"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View className="mt-8">
                    <TouchableOpacity
                        className={`rounded-2xl py-[18px] items-center ${loading ? "bg-[#00D4FF]/60" : "bg-[#03acceff]"}`}
                        onPress={submit}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        <Text className="text-white text-lg font-semibold">{loading ? "Enviando..." : "Enviar código"}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}