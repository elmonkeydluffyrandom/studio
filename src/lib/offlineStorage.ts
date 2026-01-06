// src/lib/offlineStorage.ts - VERSIÓN COMPLETA CORREGIDA
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
  
  // 🔥 VERIFICAR CONEXIÓN MEJORADO - NO SIEMPRE OFFLINE
  static async checkRealConnection(): Promise<boolean> {
    if (typeof navigator === 'undefined') return true;
    
    // 1. Primero el estado básico del navegador
    if (!navigator.onLine) {
      console.log('📴 Navegador reporta offline');
      return false;
    }
    
    console.log('🌐 Navegador reporta online, verificando conexión real...');
    
    // 2. Lista de endpoints para probar (alguno debería responder)
    const endpoints = [
      'https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js',
      'https://fonts.gstatic.com',
      'https://unpkg.com',
      window.location.origin // Tu propia app
    ];
    
    // 3. Intentar cada endpoint
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        console.log(`🔄 Probando conexión con: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'HEAD',
          mode: 'no-cors', // Importante: no-cors para evitar CORS
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Si llegamos aquí, HAY CONEXIÓN
        console.log(`✅ Conexión confirmada con: ${endpoint}`);
        return true;
        
      } catch (error) {
        // 🔥 CORRECCIÓN: Manejar error como unknown
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️ No se pudo conectar a ${endpoint}:`, errorMessage);
        // Continuar con el siguiente endpoint
        continue;
      }
    }
    
    // 4. Último intento: ping simple
    try {
      console.log('🔄 Último intento: ping simple...');
      return await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          console.log('✅ Ping exitoso');
          resolve(true);
        };
        img.onerror = () => {
          console.log('❌ Ping falló');
          resolve(false);
        };
        img.src = 'https://www.google.com/images/phd/px.gif?t=' + Date.now();
      });
    } catch (error) {
      console.log('❌ Todos los métodos fallaron, asumiendo offline');
      return false;
    }
  }

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