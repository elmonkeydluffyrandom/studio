// src/lib/offlineStorage.ts

export interface OfflineEntry {
    id: string;
    type: 'create' | 'update';
    data: any;
    timestamp: number;
    userId: string;
    status: 'pending' | 'synced' | 'failed';
  }
  
  class OfflineStorage {
    private static readonly STORAGE_KEY = 'journal_offline_v2';
    
    // Guardar entrada offline
    static saveEntry(entry: Omit<OfflineEntry, 'timestamp' | 'status'>): string {
      try {
        const entries = this.getAllEntries();
        const entryId = entry.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const offlineEntry: OfflineEntry = {
          ...entry,
          id: entryId,
          timestamp: Date.now(),
          status: 'pending'
        };
        
        entries[entryId] = offlineEntry;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
        
        console.log('✅ Guardado offline:', { id: entryId, type: entry.type });
        return entryId;
      } catch (error) {
        console.error('❌ Error guardando offline:', error);
        throw error;
      }
    }
    
    // Obtener todas las entradas
    static getAllEntries(): Record<string, OfflineEntry> {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
      } catch (error) {
        console.error('Error leyendo almacenamiento offline:', error);
        return {};
      }
    }
    
    // Obtener entradas pendientes de un usuario
    static getPendingEntries(userId: string): OfflineEntry[] {
      const entries = this.getAllEntries();
      return Object.values(entries).filter(
        entry => entry.userId === userId && entry.status === 'pending'
      );
    }
    
    // Marcar como sincronizado
    static markAsSynced(entryId: string): void {
      const entries = this.getAllEntries();
      if (entries[entryId]) {
        entries[entryId].status = 'synced';
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      }
    }
    
    // Marcar como fallido
    static markAsFailed(entryId: string): void {
      const entries = this.getAllEntries();
      if (entries[entryId]) {
        entries[entryId].status = 'failed';
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      }
    }
    
    // Eliminar entrada
    static removeEntry(entryId: string): void {
      const entries = this.getAllEntries();
      delete entries[entryId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    }
    
    // Verificar si hay cambios pendientes
    static hasPendingChanges(userId: string): boolean {
      return this.getPendingEntries(userId).length > 0;
    }
    
    // Limpiar sincronizados antiguos (más de 7 días)
    static cleanupOldEntries(): void {
      const entries = this.getAllEntries();
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      Object.keys(entries).forEach(key => {
        if (entries[key].status === 'synced' && entries[key].timestamp < oneWeekAgo) {
          delete entries[key];
        }
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    }
    
    // Forzar guardado simple (último recurso)
    static forceSave(key: string, data: any): void {
      try {
        localStorage.setItem(`force_${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        console.log('🆘 Guardado forzado:', key);
      } catch (error) {
        console.error('Error en guardado forzado:', error);
      }
    }
    
    // Verificar conexión REAL
    static async checkRealConnection(): Promise<boolean> {
      if (typeof navigator === 'undefined') return true;
      
      if (!navigator.onLine) return false;
      
      // Verificar conexión real con timeout corto
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    }
  }
  
  export default OfflineStorage;