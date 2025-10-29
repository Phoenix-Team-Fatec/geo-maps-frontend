import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import RouteProtection from '@/components/auth/RouteProtection';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <RouteProtection>
      <View className='flex-1 bg-[#1a1a2e]'>
        <StatusBar style="light" />

        <ScrollView
          className='flex-1 px-6'
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 48 }}
        >
          {/* Profile Picture */}
          <View className='items-center mb-8'>
            <View className='w-24 h-24 rounded-full bg-[#00D4FF] items-center justify-center mb-4'>
              {user?.image ? (
                <Text className='color-[#1a1a2e] text-4xl font-bold'>
                  {user.nome.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={48} color="#1a1a2e" />
              )}
            </View>
            <Text className='color-white font-bold text-2xl'>
              {user?.nome} {user?.sobrenome}
            </Text>
            <Text className='color-slate-400 text-sm mt-1'>
              {user?.email}
            </Text>
          </View>

          {/* User Information */}
          <View className='rounded-xl p-4 mb-6'>
            <Text className='color-[#00D4FF] font-semibold text-lg mb-4'>
              Informações Pessoais
            </Text>

            {/* Name */}
            <View className='flex-row items-center mb-4 pb-4 border-b border-slate-700'>
              <View className='w-10 h-10 rounded-full bg-[#1a1a2e] items-center justify-center mr-3'>
                <Ionicons name="person-outline" size={20} color="#00D4FF" />
              </View>
              <View className='flex-1'>
                <Text className='color-slate-400 text-xs mb-1'>Nome Completo</Text>
                <Text className='color-white text-base'>
                  {user?.nome} {user?.sobrenome}
                </Text>
              </View>
            </View>

            {/* Email */}
            <View className='flex-row items-center mb-4 pb-4 border-b border-slate-700'>
              <View className='w-10 h-10 rounded-full bg-[#1a1a2e] items-center justify-center mr-3'>
                <Ionicons name="mail-outline" size={20} color="#00D4FF" />
              </View>
              <View className='flex-1'>
                <Text className='color-slate-400 text-xs mb-1'>E-mail</Text>
                <Text className='color-white text-base'>
                  {user?.email || 'Não informado'}
                </Text>
              </View>
            </View>

            {/* CPF */}
            <View className='flex-row items-center mb-4 pb-4 border-b border-slate-700'>
              <View className='w-10 h-10 rounded-full bg-[#1a1a2e] items-center justify-center mr-3'>
                <Ionicons name="card-outline" size={20} color="#00D4FF" />
              </View>
              <View className='flex-1'>
                <Text className='color-slate-400 text-xs mb-1'>CPF</Text>
                <Text className='color-white text-base'>
                  {formatCPF(user?.cpf || '')}
                </Text>
              </View>
            </View>

            {/* Birth Date */}
            <View className='flex-row items-center'>
              <View className='w-10 h-10 rounded-full bg-[#1a1a2e] items-center justify-center mr-3'>
                <Ionicons name="calendar-outline" size={20} color="#00D4FF" />
              </View>
              <View className='flex-1'>
                <Text className='color-slate-400 text-xs mb-1'>Data de Nascimento</Text>
                <Text className='color-white text-base'>
                  {formatDate(user?.data_nascimento || '')}
                </Text>
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className='bg-red-600 rounded-xl p-4 flex-row items-center justify-center mt-6'
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={24} color="white" />
            <Text className='color-white font-semibold text-lg ml-2'>
              Sair da Conta
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </RouteProtection>
  );
}
