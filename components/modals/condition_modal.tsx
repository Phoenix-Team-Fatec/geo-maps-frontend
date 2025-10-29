import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';

export default function ConditionModal({ showConditionModal, setShowConditionModal, local }) {
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const { user } = useAuth();                      // pega usuário do contexto
  
  const fadeAnim = useRef(new Animated.Value(0)).current; // Fade principal (entrada/saída do modal)
  const contentFade = useRef(new Animated.Value(1)).current; // Fade interno (transição de etapas)

  useEffect(() => {
    if (showConditionModal) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showConditionModal]);

  // 🔧 Correção: fade suave entre as etapas (sem piscar)
  const transitionStep = (updateFn: () => void) => {
    Animated.timing(contentFade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      updateFn(); // muda o estado só depois do fade-out
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };




  const conditions = [
    { label: 'Trânsito', icon: 'car' },
    { label: 'Acidente', icon: 'warning' },
    { label: 'Veículo parado', icon: 'alert-circle' },
    { label: 'Polícia', icon: 'shield' },
  ];

  const severities = [
    { label: 'Leve', color: '#00D4FF' },
    { label: 'Moderada', color: '#ffb703' },
    { label: 'Intensa', color: '#ff006e' },
  ];

  if (!showConditionModal) return null;

  const handleRegister = async () => {
    try {
      const data = {
        "ocorrencia":{
          "tipo": selectedCondition.toLowerCase(),
          "gravidade": selectedSeverity.toLowerCase(),
          "coordinate": {
            "longitude": local.longitude,
            "latitude": local.latitude
          }
        },
          "area": [],
          "data_registro": "",
          "user_coordinate": {
            "longitude": local.longitude,
            "latitude": local.latitude
          },  
      }

      console.log(data)

      const resp = await fetch('/ocorrencia/adicionar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      })

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err || 'Falha ao registrar condição');
      } 

       Alert.alert('Sucesso', 'Ocorrência registrada!');


    } catch (error) {
      Alert.alert('Erro', 'Falha ao registrar condição. Tente novamente.');
    }


  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 30,
      }}
    >
      {/* Área fora do modal */}
      <TouchableOpacity
        activeOpacity={1}
        onPressOut={() => {
          setSelectedCondition(null);
          setSelectedSeverity(null);
          setShowConditionModal(false);
        }}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
      />

      {/* Conteúdo com fade interno */}
      <Animated.View
        style={{
          opacity: contentFade,
          backgroundColor: '#1a1a2e',
          borderRadius: 16,
          width: '80%',
          paddingVertical: 24,
          paddingHorizontal: 16,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 10,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#00D4FF',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          {selectedCondition ? 'Selecione a Gravidade' : 'Registrar condição da via'}
        </Text>

        {/* Etapa 1 - Selecionar condição */}
        {!selectedCondition && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            {conditions.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => transitionStep(() => setSelectedCondition(item.label))}
                style={{
                  width: '47%',
                  aspectRatio: 1,
                  backgroundColor: '#2a2a45',
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <Ionicons name={item.icon} size={36} color="#00D4FF" />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 15,
                    fontWeight: '600',
                    color: '#fff',
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Etapa 2 - Selecionar gravidade */}
        {selectedCondition && !selectedSeverity && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {severities.map((sev, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => transitionStep(() => setSelectedSeverity(sev.label))}
                style={{
                  backgroundColor: sev.color,
                  borderRadius: 12,
                  width: '28%',
                  height: 80,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#1a1a2e',
                    fontWeight: '700',
                    fontSize: 15,
                  }}
                >
                  {sev.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Etapa 3 - Confirmação */}
        {selectedCondition && selectedSeverity && (
          <View style={{ alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 16,
                color: '#fff',
                fontWeight: '600',
                marginBottom: 16,
                textAlign: 'center',
              }}
            >
              {selectedCondition} - {selectedSeverity}
            </Text>

            <TouchableOpacity
              onPress={handleRegister}
              style={{
                backgroundColor: '#00D4FF',
                borderRadius: 12,
                paddingVertical: 12,
                width: '70%',
              }}
            >
              <Text
                style={{
                  color: '#1a1a2e',
                  fontSize: 16,
                  fontWeight: '700',
                  textAlign: 'center',
                }}
              >
                Registrar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Botão voltar/cancelar */}
        <TouchableOpacity
          onPress={() => {
            if (selectedSeverity) transitionStep(() => setSelectedSeverity(null));
            else if (selectedCondition) transitionStep(() => setSelectedCondition(null));
            else setShowConditionModal(false);
          }}
          style={{
            marginTop: 16,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#00D4FF', fontWeight: '600', fontSize: 15 }}>
            {selectedCondition ? 'Voltar' : 'Cancelar'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}
