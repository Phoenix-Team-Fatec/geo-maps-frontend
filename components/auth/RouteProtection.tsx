import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { router } from 'expo-router';
import AccessDeniedModal from '@/components/modals/access-denied-modal';

interface RouteProtectionProps {
  children: React.ReactNode;
  allowGuest?: boolean;
}

export default function RouteProtection({ children, allowGuest = false }: RouteProtectionProps) {
  const { user, loading } = useAuth();
  const [modalDismissed, setModalDismissed] = useState(false);

  // If still loading auth state, show children (loading will be handled elsewhere)
  if (loading) {
    return <>{children}</>;
  }

  // If user is authenticated, always allow access
  if (user) {
    return <>{children}</>;
  }

  // If route allows guests, show children
  if (allowGuest) {
    return <>{children}</>;
  }

  // User is a guest trying to access restricted route
  // Show modal on first access
  if (!modalDismissed) {
    return (
      <View className="flex-1 bg-[#1a1a2e]">
        <AccessDeniedModal
          visible={true}
          onClose={() => setModalDismissed(true)}
        />
      </View>
    );
  }

  // Modal was dismissed, show restricted message
  return (
    <View className="flex-1 bg-[#1a1a2e] justify-center items-center px-6">
      <View className="bg-red-50 border border-red-200 rounded-lg p-6 w-full max-w-sm">
        <Text className="text-red-800 text-lg font-semibold text-center mb-2">
          Acesso Negado
        </Text>
        <Text className="text-red-600 text-center mb-4">
          Você não tem permissão para acessar esta página.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/login')}
          className="bg-red-600 rounded-lg py-2 px-4"
        >
          <Text className="text-white text-center font-medium">
            Fazer Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}