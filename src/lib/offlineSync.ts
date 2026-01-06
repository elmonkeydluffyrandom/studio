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
  
    static getQueue(): PendingEntry[] {
      try {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.error('Error leyendo cola offline:', error);
        return [];
      }
    }
  
    private static saveQueue(queue: PendingEntry[]): void {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
      } catch (error) {
        console.error('Error guardando cola offline:', error);
      }
    }
  
    static getPendingEntries(userId?: string): PendingEntry[] {
      const queue = this.getQueue();
      if (!userId) return queue;
      return queue.filter(entry => entry.userId === userId);
    }
  
    static markAsProcessed(entryId: string): void {
      const queue = this.getQueue();
      const newQueue = queue.filter(entry => entry.id !== entryId);
      this.saveQueue(newQueue);
    }
  
    static incrementAttempts(entryId: string): boolean {
      const queue = this.getQueue();
      const entry = queue.find(e => e.id === entryId);
      
      if (entry) {
        entry.attempts += 1;
        if (entry.attempts >= this.MAX_ATTEMPTS) {
          this.markAsProcessed(entryId);
          return false;
        }
        this.saveQueue(queue);
        return true;
      }
      
      return false;
    }
  
    static clearQueue(): void {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  
    static hasPendingChanges(userId?: string): boolean {
      return this.getPendingEntries(userId).length > 0;
    }
  
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
  
  export const checkConnection = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined') {
        resolve(true);
        return;
      }
  
      const online = navigator.onLine;
      
      if (online) {
        const img = new Image();
        img.src = 'https://www.google.com/favicon.ico?d=' + Date.now();
        
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        
        setTimeout(() => resolve(false), 2000);
      } else {
        resolve(false);
      }
    });
  };
  
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
  
  export const getLocalBackup = (key: string): any => {
    try {
      const backups = JSON.parse(localStorage.getItem('journal_backups') || '{}');
      return backups[key]?.data || null;
    } catch (error) {
      console.error('Error obteniendo backup:', error);
      return null;
    }
  };