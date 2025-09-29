import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

interface AccessDeniedModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AccessDeniedModal({ visible, onClose }: AccessDeniedModalProps) {
  const handleGoToLogin = () => {
    onClose();
    router.push('/login');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white rounded-lg p-6 w-full max-w-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-800">
              Acesso Restrito
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 justify-center items-center"
            >
              <Text className="text-gray-600 text-lg font-bold">×</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-gray-600 mb-6 text-center">
            Você não tem acesso a esta funcionalidade. Faça login para continuar.
          </Text>

          <TouchableOpacity
            onPress={handleGoToLogin}
            className="bg-[#00D4FF] rounded-lg py-3 px-6"
          >
            <Text className="text-white text-center font-semibold">
              Ir para Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}