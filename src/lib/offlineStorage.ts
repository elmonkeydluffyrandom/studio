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
  // 🔥 AGREGAR ESTA LÍNEA: Declarar STORAGE_KEY como estática
  private static readonly STORAGE_KEY = 'journal_offline_v2';
  
  // 🔥 AGREGAR ESTE MÉTODO: getAllEntries debe ser público o al menos existir
  static getAllEntries(): Record<string, OfflineEntry> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error leyendo almacenamiento offline:', error);
      return {};
    }
  }
  
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

  // 🔥 AGREGAR ESTOS MÉTODOS NUEVOS para journal-form.tsx

  // Serializar datos específicamente para campos HTML
  static serializeEntryData(data: any): any {
    try {
      const serialized = { ...data };
      
      const htmlFields = ['observation', 'teaching', 'practicalApplication'];
      htmlFields.forEach(field => {
        if (serialized[field]) {
          if (typeof serialized[field] === 'string') {
            let html = serialized[field].trim();
            
            if (!html.includes('<') && html.length > 0) {
              html = `<p>${html.replace(/\n/g, '<br>')}</p>`;
            }
            
            if (!html.startsWith('<')) {
              html = `<p>${html}</p>`;
            }
            
            serialized[field] = html;
          }
        } else {
          serialized[field] = '<p></p>';
        }
      });
      
      return serialized;
    } catch (error) {
      console.error('Error serializando datos:', error);
      return data;
    }
  }
  
  // Guardar entrada con serialización mejorada
  static saveEntryEnhanced(entry: Omit<OfflineEntry, 'timestamp' | 'status'>): string {
    try {
      const entries = this.getAllEntries();
      const entryId = entry.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const serializedData = this.serializeEntryData(entry.data);
      
      const offlineEntry: OfflineEntry = {
        ...entry,
        id: entryId,
        data: serializedData,
        timestamp: Date.now(),
        status: 'pending'
      };
      
      entries[entryId] = offlineEntry;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
      
      console.log('✅ Guardado offline mejorado:', { 
        id: entryId, 
        type: entry.type
      });
      return entryId;
    } catch (error) {
      console.error('❌ Error guardando offline mejorado:', error);
      throw error;
    }
  }
}

export default OfflineStorage;