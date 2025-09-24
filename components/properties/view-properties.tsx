import React from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

export default function ViewPropertiesModal({ visible, onClose, properties, onCenter, onDelete }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Propriedades</Text>
          <FlatList
            data={properties}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.name || 'Sem nome'}</Text>
                  <Text style={styles.itemSubtitle}>{item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={styles.centerButton} onPress={() => onCenter && onCenter({ latitude: item.latitude, longitude: item.longitude })}>
                    <Text style={styles.centerText}>Ver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => {
                    Alert.alert('Excluir', 'Deseja excluir esta propriedade?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Excluir', style: 'destructive', onPress: () => onDelete && onDelete(item.id) }
                    ]);
                  }}>
                    <Text style={styles.deleteText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={() => <Text style={{ color: '#999' }}>Nenhuma propriedade cadastrada</Text>}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#111827', padding: 20, borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70%' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  itemTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemSubtitle: { color: '#aaa', fontSize: 12, marginTop: 4 },
  centerButton: { backgroundColor: '#03acce', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  centerText: { color: '#000', fontWeight: '700' },
  deleteButton: { backgroundColor: '#ff4d4f', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginLeft: 8 },
  deleteText: { color: '#fff', fontWeight: '700' },
  closeButton: { marginTop: 12, alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#1f2937' },
  closeText: { color: '#fff', fontWeight: '700' },
});
