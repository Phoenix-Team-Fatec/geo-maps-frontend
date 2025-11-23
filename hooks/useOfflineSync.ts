import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import PlusCodeStorage, { SyncStatus } from '@/services/PlusCodeStorage';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  syncStatus: SyncStatus | null;
  isLoading: boolean;
  error: string | null;
  sync: () => Promise<boolean>;
  clearCache: () => Promise<void>;
}

export function useOfflineSync(autoSync: boolean = true): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monitora status da conexão
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);

      // Auto-sync quando voltar online
      if (online && autoSync) {
        syncData();
      }
    });

    return () => unsubscribe();
  }, [autoSync]);

  // Carrega status inicial
  useEffect(() => {
    loadSyncStatus();
    if (autoSync) {
      PlusCodeStorage.initialize().catch(console.error);
    }
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await PlusCodeStorage.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('Erro ao carregar status:', err);
    }
  };

  const syncData = useCallback(async (): Promise<boolean> => {
    if (!isOnline) {
      setError('Sem conexão com a internet');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await PlusCodeStorage.syncPlusCodes(true);
      if (success) {
        await loadSyncStatus();
        return true;
      } else {
        setError('Falha na sincronização');
        return false;
      }
    } catch (err) {
      setError('Erro ao sincronizar dados');
      console.error('Sync error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const clearCache = useCallback(async () => {
    try {
      await PlusCodeStorage.clearCache();
      await loadSyncStatus();
    } catch (err) {
      setError('Erro ao limpar cache');
      console.error('Clear cache error:', err);
    }
  }, []);

  return {
    isOnline,
    syncStatus,
    isLoading,
    error,
    sync: syncData,
    clearCache,
  };
}