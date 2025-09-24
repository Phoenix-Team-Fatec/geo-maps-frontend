import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

    const handleCreate = async () => {
        if (!latitude || !longitude) {
            Alert.alert('Erro', 'Informe latitude e longitude');
            return;
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        setIsSaving(true);
        try {
            const item = { id: Date.now().toString(), name, latitude: lat, longitude: lng, address };
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
                        <Text style={styles.title}>Cadastrar Propriedade</Text>
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
});
