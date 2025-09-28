import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import RouteProtection from '@/components/auth/RouteProtection';

export default function RoutesScreen() {
  return (
    <RouteProtection>
      <View className='flex-1 bg-[#1a1a2e] justify-center items-center p-20'>
        <StatusBar style="light" />
        <Text className='color-white font-bold text-2xl'>Rotas</Text>
        <Text className='color-slate-400'>Em desenvolvimento</Text>
      </View>
    </RouteProtection>
  );
}