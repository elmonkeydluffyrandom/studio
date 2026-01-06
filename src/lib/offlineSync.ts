// src/lib/offlineSync.ts

export interface PendingEntry {
    id: string;
    type: 'create' | 'update';
    data: any;
    timestamp: number;
    attempts: number;
    userId?: string;
  }
  
  export class OfflineSync {
    private static readonly STORAGE_KEY = 'journal_pending_sync';
    private static readonly MAX_ATTEMPTS = 3;
  
    // Agregar entrada a la cola de sincronización
    static addToQueue(entry: Omit<PendingEntry, 'timestamp' | 'attempts'>): string {
      const queue = this.getQueue();
      const entryId = entry.id || `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const pendingEntry: PendingEntry = {
        ...entry,
        id: entryId,
        timestamp: Date.now(),
        attempts: 0
      };
      
      queue.push(pendingEntry);
      this.saveQueue(queue);
      
      console.log('📝 Entrada agregada a cola offline:', pendingEntry);
      return entryId;
    }
  
    // Obtener cola completa
    static getQueue(): PendingEntry[] {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Error leyendo cola offline:', error);
        return [];
      }
    }
  
    // Guardar cola
    private static saveQueue(queue: PendingEntry[]): void {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
      } catch (error) {
        console.error('Error guardando cola offline:', error);
      }
    }
  
    // Obtener entradas pendientes para un usuario
    static getPendingEntries(userId?: string): PendingEntry[] {
      const queue = this.getQueue();
      if (!userId) return queue;
      return queue.filter(entry => entry.userId === userId);
    }
  
    // Marcar entrada como procesada
    static markAsProcessed(entryId: string): void {
      const queue = this.getQueue();
      const newQueue = queue.filter(entry => entry.id !== entryId);
      this.saveQueue(newQueue);
    }
  
    // Incrementar intentos
    static incrementAttempts(entryId: string): boolean {
      const queue = this.getQueue();
      const entry = queue.find(e => e.id === entryId);
      
      if (entry) {
        entry.attempts += 1;
        if (entry.attempts >= this.MAX_ATTEMPTS) {
          // Eliminar si supera máximo de intentos
          this.markAsProcessed(entryId);
          return false;
        }
        this.saveQueue(queue);
        return true;
      }
      
      return false;
    }
  
    // Limpiar cola completa
    static clearQueue(): void {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  
    // Verificar si hay cambios pendientes
    static hasPendingChanges(userId?: string): boolean {
      return this.getPendingEntries(userId).length > 0;
    }
  
    // Obtener estadísticas
    static getStats() {
      const queue = this.getQueue();
      return {
        total: queue.length,
        create: queue.filter(e => e.type === 'create').length,
        update: queue.filter(e => e.type === 'update').length,
        failed: queue.filter(e => e.attempts >= this.MAX_ATTEMPTS).length
      };
    }
  }
  
  // Helper para detectar conexión
  export const checkConnection = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined') {
        resolve(true);
        return;
      }
  
      // Verificar conexión
      const online = navigator.onLine;
      
      // Intentar hacer ping a un servidor confiable
      if (online) {
        const img = new Image();
        img.src = 'https://www.google.com/favicon.ico?d=' + Date.now();
        
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        
        // Timeout por si acaso
        setTimeout(() => resolve(false), 2000);
      } else {
        resolve(false);
      }
    });
  };
  
  // Helper para guardar en localStorage como backup
  export const saveLocalBackup = (key: string, data: any): void => {
    try {
      const backups = JSON.parse(localStorage.getItem('journal_backups') || '{}');
      backups[key] = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem('journal_backups', JSON.stringify(backups));
    } catch (error) {
      console.error('Error guardando backup:', error);
    }
  };
  
  // Helper para obtener backup
  export const getLocalBackup = (key: string): any => {
    try {
      const backups = JSON.parse(localStorage.getItem('journal_backups') || '{}');
      return backups[key]?.data || null;
    } catch (error) {
      console.error('Error obteniendo backup:', error);
      return null;
    }
  };