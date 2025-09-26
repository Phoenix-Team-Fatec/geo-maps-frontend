//@ts-ignore
import React from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';

function formatarCPF(cpf: string){

  cpf = cpf.replace(/[^\d]/g, "") 

  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")

}


type Property = {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
};

interface ReadProperty{
  cod_imovel: string;
  num_area: number;
  municipio: string;
  cod_estado: string;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  properties: Property[];
  onCenter?: (coords: { latitude: number; longitude: number }) => void;
  onDelete?: (id: string) => void;
};

export default function ViewPropertiesModal({ visible, onClose, properties, onCenter, onDelete }: Props) {
  
  const [user_properties, setUserProperties] = useState([]); 
  
  const [user_cpf, setUserCpf] = useState<string>()

  const {user} = useAuth()

  const fetchProperties = async () => {
      try{

        let cpf = formatarCPF(user.cpf)
        
        setUserCpf(cpf)

        console.log('Olaaaa')

        const response = await fetch(`/area_imovel/properties/${user_cpf}`,{
          method: "GET"
        })
        
        if (response.ok){
          const response_json = await response.json()
          
          setUserProperties(response_json)

          console.log(response_json)
          
        }
      }catch(error){
        console.log(`Erro ao listar propriedades: ${error}`)
      }
  }


  useEffect(() => {
    fetchProperties()
  }, [user_cpf])

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
  <View style={styles.backdrop}>
    <View style={styles.container}>
      <Text style={styles.title}>Propriedades ({user_properties.length})</Text>
      <FlatList
        data={user_properties}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item }) => (
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
              {/* Coordenadas - primeiro ponto do polígono */}
              {item.geometry.coordinates[0] && item.geometry.coordinates[0][0] && (
                <Text style={styles.itemSubtitle}>
                  Coordenadas: {item.geometry.coordinates[0][0][0].toFixed(6)}, {item.geometry.coordinates[0][0][1].toFixed(6)}
                </Text>
              )}
               <Text style={styles.itemSubtitle}>
                {item.pluscode 
                  ? `Plus Code: ${item.pluscode.pluscode_cod}${item.pluscode.surname ? ` (${item.pluscode.surname})` : ''}` 
                  : 'Pluscode não adicionado'
                }
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
            </View>
          </View>
        )}
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
