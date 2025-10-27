import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import * as Location from 'expo-location';

type Props = {
  visible: boolean;
  onClose: () => void;
  codImovel: string;
  onUpdated?: (saved: any) => void;
  onSelectOnMap?: () => void;
  onCenterProperty?: () => { lat: number; lng: number } | void;
};

async function putUpdatePlusCode(codImovel: string, lat: number, lng: number) {
  const body = {
    cordinates: { latitude: lat, longitude: lng }, // mantém "cordinates" conforme seu backend
    validation_date: new Date().toISOString(),
  };

  const resp = await fetch(`/area_imovel/properties/${codImovel}/pluscode`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err || 'Falha ao atualizar Plus Code');
  }
  return resp.json();
}

export default function UpdatePlusCodeModal({
  visible,
  onClose,
  codImovel,
  onUpdated,
  onSelectOnMap,
  onCenterProperty,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const handleUseMyLocation = async () => {
    try {
      setIsSaving(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Ative a permissão de localização para atualizar o Plus Code.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => Linking.openSettings?.() },
          ]
        );
        return;
      }
      if (Platform.OS === 'android') {
        try { await Location.enableNetworkProviderAsync(); } catch {}
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          Alert.alert('Localização desativada', 'Ative os serviços de localização do dispositivo.');
          return;
        }
      }
      let pos = await Location.getLastKnownPositionAsync({});
      if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!pos) pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!pos) throw new Error('Não foi possível obter a localização.');

      const { latitude: lat, longitude: lng } = pos.coords;
      const saved = await putUpdatePlusCode(codImovel, lat, lng);
      onUpdated && onUpdated(saved);
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao atualizar o Plus Code.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectOnMap = () => {
    onSelectOnMap && onSelectOnMap();
    onClose();
  };

  const handleUsePropertyCenter = async () => {
    try {
      setIsSaving(true);
      const center = onCenterProperty?.();
      if (!center) throw new Error('Centro da propriedade indisponível.');
      const saved = await putUpdatePlusCode(codImovel, center.lat, center.lng);
      onUpdated && onUpdated(saved);
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao usar o centro da propriedade.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.container}>
            <Text style={styles.title}>Atualizar Plus Code</Text>

            <TouchableOpacity style={styles.option} onPress={handleUseMyLocation} disabled={isSaving}>
              <Text style={styles.optionText}>📍 Usar minha localização</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleUsePropertyCenter} disabled={isSaving}>
              <Text style={styles.optionText}>📐 Usar centro da propriedade</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={handleSelectOnMap} disabled={isSaving}>
              <Text style={styles.optionText}>🗺️ Selecionar no mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.option, styles.cancel]} onPress={onClose}>
              <Text style={[styles.optionText, styles.cancelText]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#111827', padding: 20, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  option: { backgroundColor: '#1f2937', padding: 14, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  optionText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  cancel: { backgroundColor: '#374151', marginTop: 10 },
  cancelText: { color: '#f87171', fontWeight: '700' },
});
