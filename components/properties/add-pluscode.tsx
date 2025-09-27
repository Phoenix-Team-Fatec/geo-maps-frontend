import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '@/auth/AuthContext'; // pega dados do usuário logado


// props recebidas pelo modal
type Props = {
  visible: boolean;                                     // controla se o modal aparece
  onClose: () => void;                                  // fecha modal
  codImovel: string;                                    // código do imóvel (chave para backend)
  onCreated?: (saved: any) => void;                     // callback quando PlusCode criado
  onSelectOnMap?: () => void;                           // ativa seleção no mapa
  onCenterProperty?: () => { lat: number, lng: number } | void; // calcula centro da propriedade
};

// função que faz POST no backend criando um PlusCode
async function createPlusCode(codImovel: string, lat: number, lng: number, ownerName?: string) {
  const body = {
    cod_imovel: codImovel,
    owner_name: ownerName || 'Usuário',
    pluscode_cod: "", // obrigatório, backend vai sobrescrever
    cordinates: { longitude: lng, latitude: lat }, // "cordinates" com "r"
  };

  const resp = await fetch(`/area_imovel/properties/${codImovel}/pluscode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err || 'Falha ao criar Plus Code');
  }

  return resp.json();
}


export default function AddPropertiesModal({ visible, onClose, codImovel, onCreated, onSelectOnMap, onCenterProperty }: Props) {
  const [isSaving, setIsSaving] = useState(false); // controla loading do botão
  const { user } = useAuth();                      // pega usuário do contexto

  // nome do dono usado no PlusCode
  const ownerName =
    (user?.nome && user?.sobrenome) ? `${user.nome} ${user.sobrenome}`.trim()
    : (user?.nome || user?.email || 'Usuário');

  // opção 1: usar localização atual do celular
const handleUseMyLocation = async () => {
  try {
    setIsSaving(true);

    // 1) Verifica e pede permissão
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão negada',
        'Precisamos da sua localização para gerar o Plus Code.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Abrir ajustes',
            onPress: () => Linking.openSettings?.(),
          },
        ]
      );
      return;
    }

    // 2) Garante que o provedor de rede esteja ligado no Android (melhora muito o fix)
    if (Platform.OS === 'android') {
      try { await Location.enableNetworkProviderAsync(); } catch {}

      // opcional: verifica se o serviço está habilitado
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Localização desativada',
          'Ative os serviços de localização do dispositivo e tente novamente.'
        );
        return;
      }
    }

    // 3) Tenta última posição conhecida (quase instantâneo)
    let pos = await Location.getLastKnownPositionAsync({});
    if (!pos) {
      // 4) Se não tiver, tenta uma leitura com timeout e alta precisão
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,   // pode ajustar para Balanced se der timeout
      });
    }

    // 5) Fallback extra com precisão menor (se ainda assim falhar)
    if (!pos) {
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    }

    if (!pos) {
      throw new Error('Sem fix de GPS.');
    }

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    const saved = await createPlusCode(codImovel, lat, lng, ownerName);
    onCreated && onCreated(saved);
    onClose();

  } catch (e: any) {
    // Mostra erro real (ajuda a diagnosticar)
    Alert.alert('Erro', e?.message || 'Não foi possível obter sua localização.');
  } finally {
    setIsSaving(false);
  }
};

  // opção 2: selecionar clicando no mapa
  const handleSelectOnMap = () => {
    onSelectOnMap && onSelectOnMap(); // ativa modo mapa
    onClose();
  };

  // opção 3: calcular centro da propriedade
  const handleCenterProperty = async () => {
    if (!onCenterProperty) {
      Alert.alert('Indisponível', 'Não foi possível calcular o centro da propriedade.');
      return;
    }

    const center = onCenterProperty();
    if (center) {
      const saved = await createPlusCode(codImovel, center.lat, center.lng, ownerName);
      onCreated && onCreated(saved);
      onClose();
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
            <Text style={styles.title}>Adicionar Plus Code</Text>

            {/* usar localização */}
            <TouchableOpacity style={styles.option} onPress={handleUseMyLocation} disabled={isSaving}>
              <Text style={styles.optionText}>📍 Usar minha localização</Text>
            </TouchableOpacity>

            {/* selecionar no mapa */}
            <TouchableOpacity style={styles.option} onPress={handleSelectOnMap}>
              <Text style={styles.optionText}>🗺️ Selecionar no mapa</Text>
            </TouchableOpacity>

            {/* centro da propriedade */}
            <TouchableOpacity style={styles.option} onPress={handleCenterProperty}>
              <Text style={styles.optionText}>🏠 Centro da propriedade</Text>
            </TouchableOpacity>

            {/* cancelar */}
            <TouchableOpacity style={[styles.option, styles.cancel]} onPress={onClose}>
              <Text style={[styles.optionText, styles.cancelText]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// estilos do modal
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#111827', padding: 20, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  option: { backgroundColor: '#1f2937', padding: 14, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  optionText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  cancel: { backgroundColor: '#374151', marginTop: 10 },
  cancelText: { color: '#f87171', fontWeight: '700' },
});
