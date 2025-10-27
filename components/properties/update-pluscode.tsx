import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Coords = { lat: number; lng: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  codImovel: string;
  onUpdated?: (saved: any) => void;
  onSelectOnMap?: () => void; // pai vai mandar abrir o modo seleção
  onCenterProperty?: () => { lat: number; lng: number } | void;

  // NOVO: quando vier do mapa, o pai pode reabrir o modal já com as coords preenchidas
  prefillCoords?: Coords | null;
  // opcional: apelido atual para preencher
  currentSurname?: string;
};

async function putUpdatePlusCode(codImovel: string, coords: Coords, surname?: string) {
  const body: any = {
    cordinates: { latitude: coords.lat, longitude: coords.lng }, // mantém "cordinates"
    validation_date: new Date().toISOString(),
  };
  if (surname && surname.trim()) body.surname = surname.trim(); // envia surname se informado

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
  prefillCoords,
  currentSurname = '',
}: Props) {
  // etapa: 'choose' (escolher origem) | 'confirm' (input + confirmar PUT)
  const [step, setStep] = useState<'choose' | 'confirm'>('choose');
  const [isSaving, setIsSaving] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [surname, setSurname] = useState(currentSurname);

  // quando o modal abrir com prefill (caso do mapa), já vai para etapa "confirm"
  useEffect(() => {
    if (visible && prefillCoords) {
      setCoords(prefillCoords);
      setStep('confirm');
    }
  }, [visible, prefillCoords]);

  useEffect(() => {
    if (visible) setSurname(currentSurname || '');
  }, [visible, currentSurname]);

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

      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      setStep('confirm'); // próxima etapa: pedir surname e salvar
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao obter localização.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUsePropertyCenter = async () => {
    try {
      setIsSaving(true);
      const center = onCenterProperty?.();
      if (!center) throw new Error('Centro da propriedade indisponível.');
      setCoords({ lat: center.lat, lng: center.lng });
      setStep('confirm');
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao usar o centro da propriedade.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectOnMap = () => {
    // fecha e deixa o pai ativar o "pick mode".
    onSelectOnMap && onSelectOnMap();
    onClose();
  };

  const handleConfirm = async () => {
    if (!coords) {
      Alert.alert('Faltam dados', 'Coordenadas não definidas.');
      return;
    }
    try {
      setIsSaving(true);
      const saved = await putUpdatePlusCode(codImovel, coords, surname);
      onUpdated && onUpdated(saved);
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao atualizar o Plus Code.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.container}>
            {step === 'choose' ? (
              <>
                <Text style={styles.title}>Atualizar Plus Code</Text>

                <TouchableOpacity style={styles.option} onPress={handleUseMyLocation} disabled={isSaving}>
                  <Text style={styles.optionText}>📍 Usar minha localização</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.option} onPress={handleSelectOnMap} disabled={isSaving}>
                  <Text style={styles.optionText}>🗺️ Selecionar no mapa</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.option, styles.cancel]} onPress={onClose}>
                  <Text style={[styles.optionText, styles.cancelText]}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Confirmar atualização</Text>

                {coords && (
                  <Text style={styles.coords}>
                    Coordenadas: {coords.lng.toFixed(6)}, {coords.lat.toFixed(6)}
                  </Text>
                )}

                <TextInput
                  value={surname}
                  onChangeText={setSurname}
                  placeholder="Apelido (ex.: Sítio, Casa da Praia...)"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  maxLength={50}
                  autoFocus
                />

                <TouchableOpacity style={[styles.option, styles.save]} onPress={handleConfirm} disabled={isSaving}>
                  <Text style={styles.optionText}>Salvar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, styles.back]}
                  onPress={() => setStep('choose')}
                  disabled={isSaving}
                >
                  <Text style={styles.optionText}>← Voltar</Text>
                </TouchableOpacity>
              </>
            )}
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
  cancel: { backgroundColor: '#374151', marginTop: 6 },
  cancelText: { color: '#f87171', fontWeight: '700' },
  save: { backgroundColor: '#10b981' },
  back: { backgroundColor: '#374151' },
  input: {
    backgroundColor: '#1f2937',
    color: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  coords: { color: '#9CA3AF', marginBottom: 10, textAlign: 'center' },
});
