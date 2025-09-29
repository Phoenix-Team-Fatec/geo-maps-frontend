// @ts-ignore
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

type Property = {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  properties: Property[];
  onCenter?: (coords: { latitude: number; longitude: number }) => void;
  onDelete?: (id: string) => void;
};

export default function ViewPropertiesModal({
  visible,
  onClose,
  onCenter,
}: Props) {
  const [user_properties, setUserProperties] = useState<any[]>([]);
  const [user_cpf, setUserCpf] = useState<string>();
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);

  const { user } = useAuth();

  const fetchProperties = async () => {
    try {
      const formatted = formatarCPF(user.cpf);
      setUserCpf(formatted);

      const response = await fetch(`/area_imovel/properties/${formatted}`, {
        method: 'GET',
      });

      if (response.ok) {
        const response_json = await response.json();
        setUserProperties(response_json);
        console.log(response_json);
      }
    } catch (error) {
      console.log(`Erro ao listar propriedades: ${error}`);
    }
  };

  useEffect(() => {
    if (user?.cpf) {
      fetchProperties();
    }
  }, [user]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Propriedades ({user_properties.length})</Text>
          <FlatList
            data={user_properties}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={({ item }) => {
              const coords = item.geometry?.coordinates?.[0]?.[0] || [0, 0];
              const lng = coords[0];
              const lat = coords[1];

              return (
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {item.properties.municipio} - {item.properties.cod_estado}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Área: {item.properties.num_area}m²
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
                        if (onCenter) {
                          onCenter({ latitude: lat, longitude: lng });
                          onClose();
                        }
                      }}
                    >
                      <Text style={styles.centerText}>Ver no mapa</Text>
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
            showsVerticalScrollIndicator={false}
          />
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Detalhes */}
      {selectedProperty && (
        <Modal
          visible={!!selectedProperty}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedProperty(null)}
        >
          <View style={styles.detailsBackdrop}>
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Detalhes da Propriedade</Text>
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
              {selectedProperty.geometry?.coordinates?.[0]?.[0] && (
                <Text style={styles.detailsTextLine}>
                  Coordenadas: {selectedProperty.geometry.coordinates[0][0][0].toFixed(6)},{' '}
                  {selectedProperty.geometry.coordinates[0][0][1].toFixed(6)}
                </Text>
              )}
              <Text style={styles.detailsTextLine}>
                {selectedProperty.pluscode
                  ? `Plus Code: ${selectedProperty.pluscode.pluscode_cod}${
                      selectedProperty.pluscode.surname
                        ? ` (${selectedProperty.pluscode.surname})`
                        : ''
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

  // estilos para modal de detalhes
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
