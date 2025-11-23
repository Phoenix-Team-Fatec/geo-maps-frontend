import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';

const STORAGE_KEYS = {
  CACHED_ROUTES: '@cached_routes',
  MAP_TILES: '@map_tiles_metadata',
  OFFLINE_REGIONS: '@offline_regions',
};

interface CachedRoute {
  id: string;
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit';
  coordinates: Array<{ latitude: number; longitude: number }>;
  steps: any[];
  distance: string;
  duration: string;
  cachedAt: string;
}

interface MapTile {
  x: number;
  y: number;
  zoom: number;
  url: string;
  localPath: string;
}

interface OfflineRegion {
  id: string;
  name: string;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoomLevels: number[];
  totalTiles: number;
  downloadedTiles: number;
  sizeInMB: number;
  downloadedAt?: string;
}

class OfflineMapSystem {
  private tilesDirectory = `${FileSystem.documentDirectory}map_tiles/`;
  private maxCachedRoutes = 50;

  /**
   * Inicializa o sistema de mapas offline
   */
  async initialize(): Promise<void> {
    try {
      // Criar diretório de tiles se não existir
      const dirInfo = await FileSystem.getInfoAsync(this.tilesDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.tilesDirectory, {
          intermediates: true,
        });
      }

      console.log('✅ Sistema de mapas offline inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar sistema offline:', error);
    }
  }

  // ==================== ROTAS OFFLINE ====================

  /**
   * Salva uma rota no cache
   */
  async cacheRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    travelMode: 'driving' | 'walking' | 'bicycling' | 'transit',
    routeData: {
      coordinates: Array<{ latitude: number; longitude: number }>;
      steps: any[];
      distance: string;
      duration: string;
    }
  ): Promise<void> {
    try {
      const routeId = this.generateRouteId(origin, destination, travelMode);
      
      const cachedRoute: CachedRoute = {
        id: routeId,
        origin,
        destination,
        travelMode,
        coordinates: routeData.coordinates,
        steps: routeData.steps,
        distance: routeData.distance,
        duration: routeData.duration,
        cachedAt: new Date().toISOString(),
      };

      const existingRoutes = await this.getCachedRoutes();
      
      // Remove rota antiga se existir
      const filteredRoutes = existingRoutes.filter(r => r.id !== routeId);
      
      // Adiciona nova rota no início
      const updatedRoutes = [cachedRoute, ...filteredRoutes];
      
      // Limita o número de rotas cacheadas
      const limitedRoutes = updatedRoutes.slice(0, this.maxCachedRoutes);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_ROUTES,
        JSON.stringify(limitedRoutes)
      );

      console.log(`✅ Rota cacheada: ${routeId}`);
    } catch (error) {
      console.error('❌ Erro ao cachear rota:', error);
    }
  }

  /**
   * Busca uma rota no cache
   */
  async findCachedRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    travelMode: 'driving' | 'walking' | 'bicycling' | 'transit',
    tolerance: number = 0.001 // ~100 metros de tolerância
  ): Promise<CachedRoute | null> {
    try {
      const routes = await this.getCachedRoutes();
      
      const matchingRoute = routes.find(route => {
        const originMatch = 
          Math.abs(route.origin.latitude - origin.latitude) < tolerance &&
          Math.abs(route.origin.longitude - origin.longitude) < tolerance;
        
        const destMatch = 
          Math.abs(route.destination.latitude - destination.latitude) < tolerance &&
          Math.abs(route.destination.longitude - destination.longitude) < tolerance;
        
        const modeMatch = route.travelMode === travelMode;
        
        return originMatch && destMatch && modeMatch;
      });

      if (matchingRoute) {
        console.log(`✅ Rota encontrada no cache: ${matchingRoute.id}`);
      }

      return matchingRoute || null;
    } catch (error) {
      console.error('❌ Erro ao buscar rota cacheada:', error);
      return null;
    }
  }

  /**
   * Retorna todas as rotas cacheadas
   */
  async getCachedRoutes(): Promise<CachedRoute[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_ROUTES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Limpa rotas antigas (mais de 30 dias)
   */
  async cleanOldRoutes(): Promise<void> {
    try {
      const routes = await this.getCachedRoutes();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      
      const validRoutes = routes.filter(route => {
        const cachedDate = new Date(route.cachedAt).getTime();
        return cachedDate > thirtyDaysAgo;
      });

      await AsyncStorage.setItem(
        STORAGE_KEYS.CACHED_ROUTES,
        JSON.stringify(validRoutes)
      );

      console.log(`🗑️  ${routes.length - validRoutes.length} rotas antigas removidas`);
    } catch (error) {
      console.error('❌ Erro ao limpar rotas antigas:', error);
    }
  }

  // ==================== TILES DO MAPA ====================

  /**
   * Baixa tiles de uma região para uso offline
   */
  async downloadRegion(
    name: string,
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    zoomLevels: number[] = [10, 11, 12, 13, 14, 15]
  ): Promise<OfflineRegion> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      throw new Error('Você precisa estar online para baixar mapas');
    }

    const regionId = this.generateRegionId(name, bounds);
    
    const region: OfflineRegion = {
      id: regionId,
      name,
      bounds,
      zoomLevels,
      totalTiles: 0,
      downloadedTiles: 0,
      sizeInMB: 0,
    };

    try {
      // Calcular quantos tiles serão baixados
      const tilesToDownload: MapTile[] = [];
      
      for (const zoom of zoomLevels) {
        const tiles = this.getTilesInBounds(bounds, zoom);
        tilesToDownload.push(...tiles);
      }

      region.totalTiles = tilesToDownload.length;
      console.log(`📥 Baixando ${region.totalTiles} tiles para região: ${name}`);

      // Baixar tiles em lotes
      const batchSize = 10;
      let totalSize = 0;

      for (let i = 0; i < tilesToDownload.length; i += batchSize) {
        const batch = tilesToDownload.slice(i, i + batchSize);
        
        const downloadPromises = batch.map(tile => 
          this.downloadTile(tile).catch(err => {
            console.log(`⚠️  Erro ao baixar tile ${tile.x},${tile.y},${tile.zoom}:`, err);
            return 0;
          })
        );

        const sizes = await Promise.all(downloadPromises);
        totalSize += sizes.reduce((acc, size) => acc + size, 0);
        
        region.downloadedTiles += batch.length;
        region.sizeInMB = totalSize / (1024 * 1024);

        // Log de progresso
        const progress = Math.round((region.downloadedTiles / region.totalTiles) * 100);
        console.log(`📊 Progresso: ${progress}% (${region.downloadedTiles}/${region.totalTiles} tiles)`);
      }

      region.downloadedAt = new Date().toISOString();

      // Salvar metadata da região
      await this.saveRegionMetadata(region);

      console.log(`✅ Região ${name} baixada com sucesso! (${region.sizeInMB.toFixed(2)} MB)`);
      return region;
    } catch (error) {
      console.error('❌ Erro ao baixar região:', error);
      throw error;
    }
  }

  /**
   * Baixa um tile individual
   */
  private async downloadTile(tile: MapTile): Promise<number> {
    try {
      const localPath = `${this.tilesDirectory}${tile.zoom}/${tile.x}/${tile.y}.png`;
      
      // Verificar se já existe
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        return fileInfo.size || 0;
      }

      // Criar diretórios se necessário
      const dirPath = `${this.tilesDirectory}${tile.zoom}/${tile.x}/`;
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });

      // Baixar tile
      const downloadResult = await FileSystem.downloadAsync(tile.url, localPath);
      
      if (downloadResult.status === 200) {
        const info = await FileSystem.getInfoAsync(localPath);
        return info.size || 0;
      }

      return 0;
    } catch (error) {
      console.error(`Erro ao baixar tile ${tile.x},${tile.y}:`, error);
      return 0;
    }
  }

  /**
   * Calcula os tiles necessários para uma região
   */
  private getTilesInBounds(
    bounds: { north: number; south: number; east: number; west: number },
    zoom: number
  ): MapTile[] {
    const tiles: MapTile[] = [];

    const minTile = this.latLngToTile(bounds.north, bounds.west, zoom);
    const maxTile = this.latLngToTile(bounds.south, bounds.east, zoom);

    for (let x = minTile.x; x <= maxTile.x; x++) {
      for (let y = minTile.y; y <= maxTile.y; y++) {
        tiles.push({
          x,
          y,
          zoom,
          url: this.getTileUrl(x, y, zoom),
          localPath: `${this.tilesDirectory}${zoom}/${x}/${y}.png`,
        });
      }
    }

    return tiles;
  }

  /**
   * Converte lat/lng para coordenadas de tile
   */
  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n
    );

    return { x, y };
  }

  /**
   * Gera URL do tile (OpenStreetMap)
   */
  private getTileUrl(x: number, y: number, zoom: number): string {
    // Usando OpenStreetMap como exemplo (gratuito)
    // Para produção, considere usar Mapbox ou Google Maps com sua API key
    const subdomains = ['a', 'b', 'c'];
    const subdomain = subdomains[(x + y) % subdomains.length];
    return `https://${subdomain}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  }

  /**
   * Verifica se um tile está disponível offline
   */
  async isTileAvailableOffline(x: number, y: number, zoom: number): Promise<boolean> {
    const localPath = `${this.tilesDirectory}${zoom}/${x}/${y}.png`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    return fileInfo.exists;
  }

  /**
   * Retorna o caminho local de um tile
   */
  getTileLocalPath(x: number, y: number, zoom: number): string {
    return `${this.tilesDirectory}${zoom}/${x}/${y}.png`;
  }

  // ==================== REGIÕES OFFLINE ====================

  /**
   * Salva metadata de uma região
   */
  private async saveRegionMetadata(region: OfflineRegion): Promise<void> {
    try {
      const regions = await this.getOfflineRegions();
      const filteredRegions = regions.filter(r => r.id !== region.id);
      const updatedRegions = [...filteredRegions, region];
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_REGIONS,
        JSON.stringify(updatedRegions)
      );
    } catch (error) {
      console.error('Erro ao salvar metadata da região:', error);
    }
  }

  /**
   * Retorna todas as regiões offline disponíveis
   */
  async getOfflineRegions(): Promise<OfflineRegion[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_REGIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Remove uma região offline
   */
  async deleteRegion(regionId: string): Promise<void> {
    try {
      const regions = await this.getOfflineRegions();
      const region = regions.find(r => r.id === regionId);
      
      if (!region) {
        throw new Error('Região não encontrada');
      }

      // Remover tiles do filesystem
      for (const zoom of region.zoomLevels) {
        const dirPath = `${this.tilesDirectory}${zoom}/`;
        try {
          await FileSystem.deleteAsync(dirPath, { idempotent: true });
        } catch {
          // Ignora erros
        }
      }

      // Remover metadata
      const updatedRegions = regions.filter(r => r.id !== regionId);
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_REGIONS,
        JSON.stringify(updatedRegions)
      );

      console.log(`🗑️  Região ${region.name} removida`);
    } catch (error) {
      console.error('Erro ao remover região:', error);
      throw error;
    }
  }

  // ==================== UTILITÁRIOS ====================

  /**
   * Verifica se está online
   */
  async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * Gera ID único para uma rota
   */
  private generateRouteId(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    travelMode: string
  ): string {
    return `${origin.latitude.toFixed(4)},${origin.longitude.toFixed(4)}_${destination.latitude.toFixed(4)},${destination.longitude.toFixed(4)}_${travelMode}`;
  }

  /**
   * Gera ID único para uma região
   */
  private generateRegionId(
    name: string,
    bounds: { north: number; south: number; east: number; west: number }
  ): string {
    return `${name}_${bounds.north.toFixed(2)}_${bounds.south.toFixed(2)}`;
  }

  /**
   * Calcula tamanho total dos dados offline
   */
  async getTotalOfflineSize(): Promise<number> {
    try {
      const regions = await this.getOfflineRegions();
      return regions.reduce((total, region) => total + region.sizeInMB, 0);
    } catch {
      return 0;
    }
  }

  /**
   * Limpa todos os dados offline
   */
  async clearAllOfflineData(): Promise<void> {
    try {
      // Limpar tiles
      await FileSystem.deleteAsync(this.tilesDirectory, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.tilesDirectory, { intermediates: true });

      // Limpar metadata
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CACHED_ROUTES,
        STORAGE_KEYS.MAP_TILES,
        STORAGE_KEYS.OFFLINE_REGIONS,
      ]);

      console.log('🗑️  Todos os dados offline foram limpos');
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
      throw error;
    }
  }
}

export default new OfflineMapSystem();