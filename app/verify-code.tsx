// app/verify-code.tsx
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
import { useLocalSearchParams, useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function VerifyCode() {
    const params = useLocalSearchParams();
    const router = useRouter();

    // garanta string:
    const email =
        Array.isArray(params.email) ? params.email[0] : (params.email ?? "");

    // animações
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(40)).current;

    // inputs refs
    const inputs = useRef<Array<TextInput | null>>([]);

    // estado
    const LENGTH = 6;
    const EDITABLE = true;
    const [code, setCode] = useState<string>("".padEnd(LENGTH, " "));
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(60);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const verify = async (val?: string) => {
        // tira espaços “vazios” usados para preencher
        const final = (val ?? code).replace(/\s/g, "");
        if (final.length !== LENGTH) return;

        try {
            setLoading(true);
            const r = await fetch("/auth/password/verify", {
                method: "POST",
                body: JSON.stringify({ email, code: final }),
            });
            if (!r.ok && r.status !== 204) {
                const data = await r.json().catch(() => ({}));
                throw new Error(data?.detail || "Código inválido");
            }
            router.push({ pathname: "/reset-password", params: { email, code: final } });
        } catch (e: any) {
            Alert.alert("Ops", e?.message ?? "Falha ao validar código.");
        } finally {
            setLoading(false);
        }
    };

    const resend = async () => {
        if (cooldown > 0) return;
        try {
            setCooldown(60);
            const r = await fetch("/auth/password/forgot", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            if (!r.ok && r.status !== 204) throw new Error("Não foi possível reenviar.");
            Alert.alert("Enviado", "Novo código enviado ao seu e-mail.");
        } catch (e: any) {
            Alert.alert("Erro", e?.message ?? "Falha ao reenviar.");
            setCooldown(0);
        }
    };

    // distribui a digitação/cola de múltiplos dígitos entre as caixas
    const handleChange = (text: string, idx: number) => {
        const digits = text.replace(/\D/g, "");
        const current = code.split("");

        if (digits.length <= 1) {
            // caso normal: 1 char
            current[idx] = digits || " ";
            const next = current.join("");
            setCode(next);
            if (digits && idx < LENGTH - 1) inputs.current[idx + 1]?.focus();
            if (next.replace(/\s/g, "").length === LENGTH) verify(next);
            return;
        }

        // usuário colou "123456" etc.
        for (let i = 0; i < digits.length && idx + i < LENGTH; i++) {
            current[idx + i] = digits[i];
        }
        const next = current.join("");
        setCode(next);

        // foca no próximo “vazio”
        const firstEmpty = next.indexOf(" ");
        if (firstEmpty >= 0) inputs.current[firstEmpty]?.focus();

        if (next.replace(/\s/g, "").length === LENGTH) verify(next);
    };

    const handleKeyPress = (e: any, idx: number) => {
        if (e.nativeEvent.key === "Backspace" && !code[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus();
        }
    };

    const filledCount = code.replace(/\s/g, "").length;

    return (
        <View className="flex-1 bg-[#1a1a2e]">
            <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
            {/* bg */}
            <View className="absolute" style={{ width, height }}>
                <View
                    className="absolute w-[200px] h-[200px] rounded-[100px] bg-[#00D4FF]/5"
                    style={{ top: -50, right: -50 }}
                />
            </View>

            <Animated.View
                style={{ opacity: fade, transform: [{ translateY: slide }] }}
                className="flex-1 px-6 pt-[50px]"
            >
                <Text className="text-white text-xl font-semibold mb-8">Verificar código</Text>

                <View className="items-center mb-8">
                    <View className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/15 justify-center items-center">
                        <Text className="text-white text-2xl">🔢</Text>
                    </View>
                    <Text className="text-white/70 mt-3 text-center">
                        Enviamos um código para{"\n"}
                        <Text className="text-white">{email}</Text>
                    </Text>
                </View>

                {/* Inputs do código */}
                <View className="flex-row justify-between">
                    {Array.from({ length: LENGTH }).map((_, i) => (
                        <TextInput
                            key={i}
                            ref={(r) => (inputs.current[i] = r)}
                            className="w-12 h-14 rounded-xl bg-white/10 border border-white/15 text-white text-xl text-center"
                            keyboardType="number-pad"
                            maxLength={1}
                            value={code[i] ?? " "}
                            onChangeText={(t) => handleChange(t, i)}
                            onKeyPress={(e) => handleKeyPress(e, i)}
                            editable={EDITABLE}
                            selectTextOnFocus
                            // ajuda o iOS a sugerir OTP de SMS:
                            textContentType="oneTimeCode"
                            autoComplete="sms-otp"
                            // foco inicial no primeiro
                            autoFocus={i === 0}
                        />
                    ))}
                </View>

                {/* Botão continuar */}
                <TouchableOpacity
                    className={`mt-8 rounded-2xl py-[16px] items-center ${loading ? "bg-[#00D4FF]/60" : "bg-[#03acceff]"
                        }`}
                    onPress={() => verify()}
                    disabled={loading || filledCount !== LENGTH}
                    activeOpacity={0.85}
                >
                    <Text className="text-white text-base font-semibold">
                        {loading ? "Verificando..." : "Continuar"}
                    </Text>
                </TouchableOpacity>

                {/* Reenviar */}
                <View className="items-center mt-6">
                    <TouchableOpacity onPress={resend} disabled={cooldown > 0} activeOpacity={0.8}>
                        <Text className={cooldown > 0 ? "text-white/40" : "text-[#00D4FF]"}>
                            {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar código"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}