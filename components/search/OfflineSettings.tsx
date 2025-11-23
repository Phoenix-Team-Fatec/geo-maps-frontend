import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function OfflineSettings() {
  const { isOnline, syncStatus, isLoading, error, sync, clearCache } = useOfflineSync(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const estimatedSize = syncStatus
    ? formatBytes((syncStatus.totalCached * 150)) // ~150 bytes por registro
    : '0 B';

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert(
        'Sem conexão',
        'Você precisa estar conectado à internet para sincronizar.'
      );
      return;
    }

    const success = await sync();
    if (success) {
      Alert.alert('Sucesso', 'Dados sincronizados com sucesso!');
    } else {
      Alert.alert('Erro', 'Não foi possível sincronizar os dados.');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Limpar cache',
      'Isso removerá todos os dados salvos para uso offline. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            await clearCache();
            Alert.alert('Cache limpo', 'Os dados foram removidos com sucesso.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-8 border-b border-gray-100">
        <View className="flex-row items-center mb-2">
          <Ionicons name="cloud-offline-outline" size={32} color="#00D4FF" />
          <Text className="text-2xl font-bold text-gray-900 ml-3">
            Modo Offline
          </Text>
        </View>
        <Text className="text-gray-600">
          Gerencie os dados salvos para uso sem conexão
        </Text>
      </View>

      {/* Status Card */}
      <View className="bg-white mx-4 mt-4 rounded-xl p-5 shadow-sm">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-gray-900">Status</Text>
          <View
            className={`px-3 py-1 rounded-full flex-row items-center ${
              isOnline ? 'bg-green-100' : 'bg-orange-100'
            }`}
          >
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                isOnline ? 'bg-green-500' : 'bg-orange-500'
              }`}
            />
            <Text
              className={`text-xs font-medium ${
                isOnline ? 'text-green-700' : 'text-orange-700'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View className="space-y-3">
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-gray-600">Locais salvos</Text>
            <Text className="text-gray-900 font-semibold">
              {syncStatus?.totalCached || 0}
            </Text>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <Text className="text-gray-600">Tamanho aproximado</Text>
            <Text className="text-gray-900 font-semibold">{estimatedSize}</Text>
          </View>

          <View className="flex-row justify-between items-center py-2">
            <Text className="text-gray-600">Última sincronização</Text>
            <Text className="text-gray-900 font-semibold">
              {formatDate(syncStatus?.lastSync || null)}
            </Text>
          </View>
        </View>

        {error && (
          <View className="mt-4 bg-red-50 rounded-lg p-3 flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text className="text-red-600 ml-2 flex-1">{error}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="px-4 mt-4">
        {/* Sync Button */}
        <TouchableOpacity
          onPress={handleSync}
          disabled={!isOnline || isLoading}
          className={`bg-blue-500 rounded-xl p-4 flex-row items-center justify-center ${
            !isOnline || isLoading ? 'opacity-50' : ''
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="sync" size={20} color="white" />
              <Text className="text-white font-semibold ml-2 text-base">
                Sincronizar agora
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!isOnline && (
          <Text className="text-center text-gray-500 mt-2 text-sm">
            Conecte-se à internet para sincronizar
          </Text>
        )}

        {/* Clear Cache Button */}
        <TouchableOpacity
          onPress={handleClearCache}
          disabled={isLoading || (syncStatus?.totalCached || 0) === 0}
          className={`mt-3 border-2 border-red-500 rounded-xl p-4 flex-row items-center justify-center ${
            isLoading || (syncStatus?.totalCached || 0) === 0 ? 'opacity-50' : ''
          }`}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text className="text-red-500 font-semibold ml-2 text-base">
            Limpar cache
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View className="mx-4 mt-6 mb-6 bg-blue-50 rounded-xl p-4">
        <View className="flex-row items-start">
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <View className="flex-1 ml-3">
            <Text className="text-blue-900 font-semibold mb-1">
              Como funciona?
            </Text>
            <Text className="text-blue-800 text-sm leading-5">
              Quando você está online, o app salva automaticamente os Plus Codes
              para uso offline. Você pode buscar e navegar para esses locais mesmo
              sem conexão.
            </Text>
          </View>
        </View>
      </View>

      {/* Auto-sync info */}
      <View className="mx-4 mb-6 bg-gray-100 rounded-xl p-4">
        <View className="flex-row items-center mb-2">
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text className="text-gray-900 font-medium ml-2">
            Sincronização automática ativa
          </Text>
        </View>
        <Text className="text-gray-600 text-sm">
          Os dados são atualizados automaticamente a cada hora quando você está online.
        </Text>
      </View>
    </ScrollView>
  );
}