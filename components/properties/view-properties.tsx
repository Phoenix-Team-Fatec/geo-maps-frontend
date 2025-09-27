import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/auth/AuthContext';

function formatarCPF(cpf: string) {
  cpf = cpf.replace(/[^\d]/g, '');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onCenter?: (coords: { latitude: number; longitude: number }) => void;
  onGeneratePlusCode?: (property: any) => void;
};

export default function ViewPropertiesModal({
  visible,
  onClose,
  onCenter,
  onGeneratePlusCode,
}: Props) {
  const [userProperties, setUserProperties] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const { user } = useAuth();

  const fetchProperties = async () => {
    try {
      const formatted = formatarCPF(user.cpf);
      const response = await fetch(`/area_imovel/properties/${formatted}`, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        setUserProperties(data);
        console.log(data);
      }
    } catch (error) {
      console.log(`Erro ao listar propriedades: ${error}`);
    }
  };

  useEffect(() => {
    if (user?.cpf) fetchProperties();
  }, [user]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Propriedades ({userProperties.length})</Text>

          <FlatList
            data={userProperties}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => {
              // Pega um ponto do anel externo (serve p/ Polygon e MultiPolygon)
              const coords =
                item.geometry?.type === 'MultiPolygon'
                  ? item.geometry?.coordinates?.[0]?.[0]?.[0]
                  : item.geometry?.coordinates?.[0]?.[0];

              const [lng, lat] = Array.isArray(coords) ? coords : [0, 0];

              return (
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {item.properties.municipio} - {item.properties.cod_estado}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Código: {item.properties.cod_imovel?.slice(-12) || 'N/A'}
                    </Text>
                  </View>

                  {/* Botões */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() => setSelectedProperty(item)}
                    >
                      <Text style={styles.detailsText}>Detalhes</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.centerButton}
                      onPress={() => {
                        if (onCenter && Number.isFinite(lat) && Number.isFinite(lng)) {
                          onCenter({ latitude: lat, longitude: lng });
                          onClose();
                        }
                      }}
                    >
                      <Text style={styles.centerText}>Ver no mapa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.centerButton, { backgroundColor: '#10b981' }]} // verde
                      onPress={() => onGeneratePlusCode && onGeneratePlusCode(item)}
                    >
                      <Text style={[styles.centerText, { color: '#000' }]}>Gerar Plus Code</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={() => (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#999', textAlign: 'center' }}>
                  Nenhuma propriedade cadastrada
                </Text>
              </View>
            )}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de detalhes */}
      {selectedProperty && (
        <Modal
          visible={!!selectedProperty}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedProperty(null)}
        >
          <View style={styles.detailsBackdrop}>
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Detalhes</Text>
              <Text style={styles.detailsTextLine}>
                Município: {selectedProperty.properties.municipio}
              </Text>
              <Text style={styles.detailsTextLine}>
                Estado: {selectedProperty.properties.cod_estado}
              </Text>
              <Text style={styles.detailsTextLine}>
                Área: {selectedProperty.properties.num_area}m²
              </Text>
              <Text style={styles.detailsTextLine}>
                Código: {selectedProperty.properties.cod_imovel}
              </Text>

              {/* Exibe o mesmo ponto usado no botão */}
              {(() => {
                const c =
                  selectedProperty.geometry?.type === 'MultiPolygon'
                    ? selectedProperty.geometry?.coordinates?.[0]?.[0]?.[0]
                    : selectedProperty.geometry?.coordinates?.[0]?.[0];
                const [lng, lat] = Array.isArray(c) ? c : [null, null];
                return Number.isFinite(lat) && Number.isFinite(lng) ? (
                  <Text style={styles.detailsTextLine}>
                    Coordenadas: {Number(lng).toFixed(6)}, {Number(lat).toFixed(6)}
                  </Text>
                ) : null;
              })()}

              <Text style={styles.detailsTextLine}>
                {selectedProperty.pluscode
                  ? `Plus Code: ${selectedProperty.pluscode.pluscode_cod}${
                      selectedProperty.pluscode.surname ? ` (${selectedProperty.pluscode.surname})` : ''
                    }`
                  : 'Pluscode não adicionado'}
              </Text>

              <TouchableOpacity
                style={styles.detailsCloseButton}
                onPress={() => setSelectedProperty(null)}
              >
                <Text style={styles.closeText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: '#111827',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '70%',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemSubtitle: { color: '#aaa', fontSize: 12, marginTop: 4 },
  detailsButton: {
    backgroundColor: '#4B5563',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  detailsText: { color: '#fff', fontWeight: '700' },
  centerButton: {
    backgroundColor: '#03acce',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  centerText: { color: '#000', fontWeight: '700' },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  closeText: { color: '#fff', fontWeight: '700' },

  detailsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    width: '100%',
  },
  detailsTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  detailsTextLine: { color: '#ccc', fontSize: 14, marginTop: 6 },
  detailsCloseButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
});
