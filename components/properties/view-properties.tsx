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
import AddPropertiesModal from '@/components/properties/add-pluscode';
import UpdatePlusCodeModal from '@/components/properties/update-pluscode';

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
  useEffect(() => {
    if (selectedProperty) {
      const updated = userProperties.find(
        (p) => p.id === selectedProperty.id
      );
      if (updated) setSelectedProperty(updated);
    }
  }, [userProperties]);

  return (
   <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
  <View style={styles.backdrop}>
    <View style={styles.container}>
      <Text style={styles.title}>Propriedades ({userProperties.length})</Text>

      <FlatList
        data={userProperties}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item }) => {
  const coords =
    item.geometry?.type === 'MultiPolygon'
      ? item.geometry?.coordinates?.[0]?.[0]?.[0]
      : item.geometry?.coordinates?.[0]?.[0];

  const [lng, lat] = Array.isArray(coords) ? coords : [0, 0];

  // Verifica se há Plus Code associado
  const hasPlusCode = !!item.pluscode && Object.keys(item.pluscode).length > 0;

  // Define cor de fundo conforme o estado
  const backgroundColor = hasPlusCode ? '#234324ff' : '#911232ff'; // verde / laranja
  

  return (
    <View style={[styles.itemCard, { backgroundColor }]}>
      {/* Textos no topo */}
      <View style={styles.textContainer}>
        <Text style={styles.itemTitle}>
          {item.properties.municipio} - {item.properties.cod_estado}
        </Text>
        <Text style={styles.itemSubtitle}>
          Código: {item.properties.cod_imovel?.slice(-12) || 'N/A'}
        </Text>
      </View>

      {/* Botões na parte inferior */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={async () => {
            await fetchProperties();
            const updated = userProperties.find((p) => p.id === item.id);
            setSelectedProperty(updated || item);
          }}
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
          style={[styles.centerButton, styles.plusCodeButton]}
          onPress={() => onGeneratePlusCode && onGeneratePlusCode(item)}
        >
          <Text style={styles.plusCodeText}>
            {hasPlusCode ? 'Atualizar Plus Code' : 'Gerar Plus Code'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}}

        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
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

type FlowProps = {
  visible: boolean;
  onClose: () => void;
  onCenter?: (coords: { latitude: number; longitude: number }) => void;
};

export function ViewPropertiesFlow({ visible, onClose, onCenter }: FlowProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [currentCodImovel, setCurrentCodImovel] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<any | null>(null);

  function handlePlusCodeAction(item: any) {
    setCurrentCodImovel(item?.properties?.cod_imovel ?? null);
    setCurrentItem(item);
    const hasPlusCode = !!item?.pluscode && Object.keys(item.pluscode).length > 0;
    if (hasPlusCode) setUpdateOpen(true);
    else setAddOpen(true);
  }

  function handleSelectOnMap() {
    // (Opcional) Ative o modo de seleção no mapa aqui.
  }

  function handleCenterFromProperty(): { lat: number; lng: number } | void {
    if (!currentItem?.geometry) return;
    const c =
      currentItem.geometry?.type === 'MultiPolygon'
        ? currentItem.geometry?.coordinates?.[0]?.[0]?.[0]
        : currentItem.geometry?.coordinates?.[0]?.[0];
    if (Array.isArray(c)) {
      const [lng, lat] = c;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  return (
    <>
      <ViewPropertiesModal
        visible={visible}
        onClose={onClose}
        onCenter={onCenter}
        onGeneratePlusCode={handlePlusCodeAction}
      />

      {currentCodImovel && (
        <>
          <AddPropertiesModal
            visible={addOpen}
            onClose={() => setAddOpen(false)}
            codImovel={currentCodImovel}
            onCreated={() => {
              // A lista se autoatualiza ao abrir; se quiser, reabra/forçe refetch aqui.
            }}
            onSelectOnMap={handleSelectOnMap}
            onCenterProperty={handleCenterFromProperty}
          />

          <UpdatePlusCodeModal
            visible={updateOpen}
            onClose={() => setUpdateOpen(false)}
            codImovel={currentCodImovel}
            onUpdated={() => {
              // Idem acima.
            }}
            onSelectOnMap={handleSelectOnMap}
            onCenterProperty={handleCenterFromProperty}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  container: {
    backgroundColor: '#111827',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '70%',
  },
  title: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12 
  },
  
  // Card do item reorganizado
  itemCard: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  
  // Container dos textos (topo)
  textContainer: {
    marginBottom: 16,
  },
  itemTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtitle: { 
    color: '#9ca3af', 
    fontSize: 14,
  },
  
  // Container dos botões (base)
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  detailsButton: {
    backgroundColor: '#4B5563',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  detailsText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 13,
  },
  
  centerButton: {
    backgroundColor: '#03acce',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  centerText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 13,
  },
  
  plusCodeButton: {
    backgroundColor: '#10b981',
    flex: 1,
    minWidth: 120,
  },
  plusCodeText: { 
    color: '#000', 
    fontWeight: '600',
    fontSize: 13,
  },
  
  closeButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  closeText: { 
    color: '#fff', 
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Empty state
  emptyContainer: { 
    padding: 32, 
    alignItems: 'center' 
  },
  emptyText: { 
    color: '#9ca3af', 
    textAlign: 'center',
    fontSize: 16,
  },

  // Modal de detalhes
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
  detailsTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 16 
  },
  detailsTextLine: { 
    color: '#e5e7eb', 
    fontSize: 15, 
    marginBottom: 8,
    lineHeight: 22,
  },
  detailsCloseButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
});