import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

const STORAGE_KEYS = {
  PLUS_CODES: '@pluscode_cache',
  LAST_SYNC: '@pluscode_last_sync',
  SYNC_STATUS: '@pluscode_sync_status',
};

export interface PlusCode {
  id: string;
  surname: string;
  pluscode_cod: string;
  cordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface SyncStatus {
  lastSync: string | null;
  isOnline: boolean;
  totalCached: number;
}

class PlusCodeStorage {
  private syncInProgress = false;

  /**
   * Verifica se está online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * Salva plus-codes no cache local
   */
  async savePlusCodes(plusCodes: PlusCode[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PLUS_CODES,
        JSON.stringify(plusCodes)
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );
      console.log(`✅ ${plusCodes.length} plus-codes salvos no cache`);
    } catch (error) {
      console.error('Erro ao salvar plus-codes:', error);
      throw error;
    }
  }

  /**
   * Busca plus-codes do cache local
   */
  async getPlusCodes(): Promise<PlusCode[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PLUS_CODES);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao buscar plus-codes do cache:', error);
      return [];
    }
  }

  /**
   * Sincroniza plus-codes com o servidor (quando online)
   */
  async syncPlusCodes(forceSync = false): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('⏳ Sincronização já em andamento...');
      return false;
    }

    const online = await this.isOnline();
    if (!online) {
      console.log('📵 Offline - usando dados em cache');
      return false;
    }

    // Verifica se precisa sincronizar
    if (!forceSync) {
      const lastSync = await this.getLastSyncDate();
      if (lastSync) {
        const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync < 1) {
          console.log('⏭️  Sincronização recente, pulando...');
          return false;
        }
      }
    }

    this.syncInProgress = true;

    try {
      console.log('🔄 Sincronizando plus-codes...');
      const response = await axios.get('/plus-code/get', {
        timeout: 10000,
      });

      const plusCodes: PlusCode[] = response.data;
      await this.savePlusCodes(plusCodes);
      
      console.log(`✅ ${plusCodes.length} plus-codes sincronizados`);
      return true;
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Busca plus-codes (tenta online primeiro, fallback para cache)
   */
  async searchPlusCodes(query: string): Promise<PlusCode[]> {
    const online = await this.isOnline();
    
    // Se offline, busca apenas no cache
    if (!online) {
      console.log('📵 Modo offline - buscando no cache');
      return this.searchInCache(query);
    }

    // Se online, tenta sincronizar primeiro (se necessário)
    await this.syncPlusCodes();

    // Busca no cache atualizado
    return this.searchInCache(query);
  }

  /**
   * Busca plus-codes no cache local
   */
  private async searchInCache(query: string): Promise<PlusCode[]> {
    const cachedCodes = await this.getPlusCodes();
    
    if (!query || query.length < 2) {
      return cachedCodes.slice(0, 10); // Retorna os 10 primeiros se não há query
    }

    const lowerQuery = query.toLowerCase();
    return cachedCodes.filter(
      (pc) =>
        pc.surname.toLowerCase().includes(lowerQuery) ||
        pc.pluscode_cod.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Retorna data da última sincronização
   */
  async getLastSyncDate(): Promise<Date | null> {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return lastSync ? new Date(lastSync) : null;
    } catch {
      return null;
    }
  }

  /**
   * Retorna status da sincronização
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const [lastSync, isOnline, cachedCodes] = await Promise.all([
      this.getLastSyncDate(),
      this.isOnline(),
      this.getPlusCodes(),
    ]);

    return {
      lastSync: lastSync?.toISOString() || null,
      isOnline,
      totalCached: cachedCodes.length,
    };
  }

  /**
   * Limpa o cache
   */
  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PLUS_CODES,
      STORAGE_KEYS.LAST_SYNC,
    ]);
    console.log('🗑️  Cache limpo');
  }

  /**
   * Inicializa o storage (sincroniza se necessário)
   */
  async initialize(): Promise<void> {
    const online = await this.isOnline();
    const cachedCodes = await this.getPlusCodes();

    if (online && cachedCodes.length === 0) {
      console.log('📥 Primeira sincronização...');
      await this.syncPlusCodes(true);
    } else if (online) {
      // Sincroniza em background se online
      this.syncPlusCodes().catch(console.error);
    } else {
      console.log(`📵 Offline - ${cachedCodes.length} plus-codes em cache`);
    }
  }
}

export default new PlusCodeStorage();