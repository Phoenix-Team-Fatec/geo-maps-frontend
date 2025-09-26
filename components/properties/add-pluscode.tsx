import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Alert, Animated, Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Static import to ensure bundlers include the module and avoid runtime dynamic import issues
import * as OLC from 'open-location-code';
type Props = {
    visible: boolean;
    onClose: () => void;
    onCreated?: (item: any) => void;
    initialLatitude?: number;
    initialLongitude?: number;
    initialAddress?: string;
    showClipboardPrompt?: boolean;
};

function parseLatLng(text: string): { lat: string, lng: string } | null {

    // Aceita formatos como: "-23.5, -46.6" ou "-23.5;-46.6"
    const match = text.match(/(-?\d+(\.\d+)?)[,; ]\s*(-?\d+(\.\d+)?)/);
    if (match) {
        return { lat: match[1], lng: match[3] };
    }
    return null;
}

export default function AddPropertiesModal({ visible, onClose, onCreated, initialLatitude, initialLongitude, initialAddress, showClipboardPrompt }: Props) {
    const [name, setName] = useState('');
    const [latitude, setLatitude] = useState<string>('');
    const [longitude, setLongitude] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [computedPlusCode, setComputedPlusCode] = useState<string>('');
    const [plusCodeGenerating, setPlusCodeGenerating] = useState(false);
    const [plusCodeErrorMsg, setPlusCodeErrorMsg] = useState<string | null>(null);
    const [copiedToastVisible, setCopiedToastVisible] = useState(false);
    const copyToastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            setName('');
            setLatitude(initialLatitude !== undefined ? String(initialLatitude) : '');
            setLongitude(initialLongitude !== undefined ? String(initialLongitude) : '');
            setAddress(initialAddress ?? '');

            // Checar a área de transferência 
                const shouldPrompt = showClipboardPrompt === undefined ? true : !!showClipboardPrompt;
                if (shouldPrompt) {
                Clipboard.getStringAsync().then(text => {
                    const parsed = parseLatLng(text);
                    if (parsed) {
                        Alert.alert(
                            'Transferir localização',
                            `Detectamos latitude e longitude: ${parsed.lat}, ${parsed.lng}\nDeseja colar esses valores?`,
                            [
                                { text: 'Não', style: 'cancel' },
                                {
                                    text: 'Sim',
                                    onPress: () => {
                                        setLatitude(parsed.lat);
                                        setLongitude(parsed.lng);
                                    }
                                }
                            ]
                        );
                    }
                });
            }
        }
    }, [visible, initialLatitude, initialLongitude, initialAddress, showClipboardPrompt]);

    // cleanup copy toast timer on unmount
    React.useEffect(() => {
        return () => {
            if (copyToastTimer.current) {
                clearTimeout(copyToastTimer.current);
            }
        };
    }, []);

    const generatePlusCode = async () => {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            setPlusCodeErrorMsg('Latitude e longitude inválidas.');
            return;
        }

        setPlusCodeGenerating(true);
        setPlusCodeErrorMsg(null);
        try {
            const mod: any = OLC;
            let plus = '';

            // Defensive extraction: prefer candidate.encode, then function, then named OpenLocationCode
            try {
                const candidate = mod && (mod.default ?? mod);
                if (candidate) {
                    if (typeof candidate.encode === 'function') {
                        plus = candidate.encode(lat, lng);
                    } else if (typeof candidate === 'function') {
                        plus = candidate(lat, lng);
                    }
                }
            } catch (e) {
                console.warn('[PlusCode] candidate encode failed', e);
            }

            if (!plus && mod && typeof mod.OpenLocationCode === 'function') {
                try {
                    const Inst = mod.OpenLocationCode;
                    const maybe = Object.getOwnPropertyDescriptor(Inst, 'prototype');
                    if (maybe) {
                        const inst = new Inst();
                        if (typeof inst.encode === 'function') plus = inst.encode(lat, lng);
                    }
                } catch (e) {
                    console.warn('[PlusCode] OpenLocationCode constructor failed', e);
                }
            }

            if (plus) {
                setComputedPlusCode(plus);
            } else {
                setComputedPlusCode('');
                setPlusCodeErrorMsg('Não foi possível gerar o PlusCode.');
            }
        } catch (err) {
            console.error('[PlusCode] fatal error', err);
            setComputedPlusCode('');
            setPlusCodeErrorMsg('Erro ao gerar PlusCode.');
            Alert.alert('Erro', 'Ocorreu um erro ao carregar o gerador de PlusCode. Veja o console.');
        } finally {
            setPlusCodeGenerating(false);
        }
    };

const handleCreate = async () => {
  if (!latitude || !longitude) {
    Alert.alert('Erro', 'Informe latitude e longitude');
    return;
  }
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

        // Usar o plusCode já calculado reativamente (se disponível)
        const finalPlusCode = computedPlusCode || '';

        setIsSaving(true);
        try {
            const item = {
                id: Date.now().toString(),
                name,
                latitude: lat,
                longitude: lng,
                address,
                plusCode: finalPlusCode,
            };
            onCreated && onCreated(item);
        } finally {
            setIsSaving(false);
        }
};

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
            <View style={styles.backdrop}>
                <KeyboardAvoidingView
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.container}>
                        <Text style={styles.title}>Cadastrar PlusCode</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome (opcional)"
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#999"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Latitude"
                            value={latitude}
                            onChangeText={setLatitude}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Longitude"
                            value={longitude}
                            onChangeText={setLongitude}
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Endereço (opcional)"
                            value={address}
                            onChangeText={setAddress}
                            placeholderTextColor="#999"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                        />

                        <View style={styles.plusCodeBox}>
                            {plusCodeGenerating ? (
                                <Text style={styles.plusCodeText}>Gerando PlusCode...</Text>
                            ) : computedPlusCode ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={styles.plusCodeText}>{computedPlusCode}</Text>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            try {
                                                await Clipboard.setStringAsync(computedPlusCode);
                                                // show toast with fade in
                                                setCopiedToastVisible(true);
                                                Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
                                                if (copyToastTimer.current) clearTimeout(copyToastTimer.current);
                                                copyToastTimer.current = setTimeout(() => {
                                                    // fade out then hide
                                                    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
                                                        setCopiedToastVisible(false);
                                                    });
                                                }, 1500);
                                            } catch (e) {
                                                // ignore
                                            }
                                        }}
                                        style={[styles.copyButton, { backgroundColor: '#03acce' }]}
                                    >
                                        <Text style={{ color: '#000', fontWeight: '700' }}>Copiar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : plusCodeErrorMsg ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={styles.plusCodeError}>{plusCodeErrorMsg}</Text>
                                    <TouchableOpacity
                                        onPress={() => generatePlusCode()}
                                        style={[styles.copyButton, { backgroundColor: '#03acce' }]}
                                    >
                                        <Text style={{ color: '#000', fontWeight: '700' }}>Gerar</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={styles.plusCodeHint}>PlusCode</Text>
                                    <TouchableOpacity
                                        onPress={() => generatePlusCode()}
                                        style={[styles.copyButton, { backgroundColor: '#03acce' }]}
                                    >
                                        <Text style={{ color: '#000', fontWeight: '700' }}>Gerar</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {copiedToastVisible && (
                            <Animated.View
                                style={[
                                    styles.snackbar,
                                    { opacity: fadeAnim, position: 'absolute', alignSelf: 'center', bottom: 130, left: undefined, right: undefined }
                                ]}
                                pointerEvents="none"
                            >
                                <Text style={styles.snackbarText}>PlusCode copiado</Text>
                            </Animated.View>
                        )}

                        <View style={styles.row}>
                            <TouchableOpacity style={styles.button} onPress={onClose}>
                                <Text style={styles.buttonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleCreate} disabled={isSaving}>
                                <Text style={[styles.buttonText, styles.primaryText]}>{isSaving ? 'Salvando...' : 'Criar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { backgroundColor: '#111827', padding: 20, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
    input: { backgroundColor: '#0b1220', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    button: { padding: 12, borderRadius: 8, backgroundColor: '#1f2937', flex: 1, alignItems: 'center', marginHorizontal: 6 },
    primary: { backgroundColor: '#03acce' },
    buttonText: { color: '#fff' },
    primaryText: { color: '#000', fontWeight: '700' },
    plusCodeBox: { backgroundColor: '#0b1220', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#22303a' },
    plusCodeText: { color: '#fff', fontWeight: '700' },
    copyButton: { backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, marginLeft: 10 },
    plusCodeError: { color: '#fbb' },
    plusCodeHint: { color: '#999' },
    snackbar: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 24,
        backgroundColor: '#111827',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#22303a',
    },
    snackbarText: { color: '#fff' },
});
