// src/lib/firebaseOffline.ts

import { OfflineSync, checkConnection } from './offlineSync';

export class FirebaseOffline {
  static async saveWithOfflineSupport(
    firestore: any,
    userId: string,
    saveFunction: () => Promise<any>,
    entryData: any,
    entryId?: string
  ): Promise<{ success: boolean; offline: boolean; entryId: string }> {
    
    const isConnected = await checkConnection();
    
    if (!isConnected) {
      console.log('📴 Modo offline detectado, guardando localmente...');
      
      const pendingId = OfflineSync.addToQueue({
        id: entryId || `temp_${Date.now()}`,
        type: entryId ? 'update' : 'create',
        data: entryData,
        userId
      });
      
      const backupKey = entryId ? `entry_${entryId}` : `new_${Date.now()}`;
      localStorage.setItem(`backup_${backupKey}`, JSON.stringify({
        data: entryData,
        timestamp: Date.now(),
        userId
      }));
      
      return {
        success: true,
        offline: true,
        entryId: pendingId
      };
    }
    
    try {
      console.log('🟢 Conexión detectada, guardando en Firebase...');
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 10000);
      });
      
      const result = await Promise.race([saveFunction(), timeoutPromise]);
      
      console.log('✅ Guardado exitoso en Firebase');
      return {
        success: true,
        offline: false,
        entryId: entryId || result?.id || `firebase_${Date.now()}`
      };
      
    } catch (error: any) {
      console.error('❌ Error guardando en Firebase:', error);
      
      const pendingId = OfflineSync.addToQueue({
        id: entryId || `temp_${Date.now()}`,
        type: entryId ? 'update' : 'create',
        data: entryData,
        userId
      });
      
      return {
        success: false,
        offline: true,
        entryId: pendingId
      };
    }
  }

  static async syncPendingEntries(
    firestore: any,
    userId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ synced: number; failed: number }> {
    
    const pendingEntries = OfflineSync.getPendingEntries(userId);
    if (pendingEntries.length === 0) {
      return { synced: 0, failed: 0 };
    }
    
    console.log(`🔄 Sincronizando ${pendingEntries.length} entradas pendientes...`);
    
    let synced = 0;
    let failed = 0;
    
    const { doc, setDoc, addDoc, collection, Timestamp } = await import('firebase/firestore');
    
    for (const entry of pendingEntries) {
      try {
        if (entry.type === 'update' && entry.data.id) {
          const entryRef = doc(firestore, 'users', userId, 'journalEntries', entry.data.id);
          await setDoc(entryRef, {
            ...entry.data,
            updatedAt: Timestamp.now(),
            _syncedFromOffline: true
          }, { merge: true });
        } else if (entry.type === 'create') {
          const entriesCollection = collection(firestore, 'users', userId, 'journalEntries');
          await addDoc(entriesCollection, {
            ...entry.data,
            createdAt: Timestamp.now(),
            _syncedFromOffline: true
          });
        }
        
        OfflineSync.markAsProcessed(entry.id);
        synced++;
        
        if (onProgress) {
          onProgress(synced, pendingEntries.length);
        }
        
      } catch (error) {
        console.error(`Error sincronizando entrada ${entry.id}:`, error);
        
        const shouldRetry = OfflineSync.incrementAttempts(entry.id);
        if (!shouldRetry) {
          failed++;
        }
      }
    }
    
    console.log(`✅ Sincronización completada: ${synced} exitosas, ${failed} fallidas`);
    return { synced, failed };
  }

  static async getConnectionStatus(): Promise<{
    online: boolean;
    firebaseReachable: boolean;
    pendingEntries: number;
  }> {
    const online = await checkConnection();
    const pendingEntries = OfflineSync.getPendingEntries().length;
    
    let firebaseReachable = false;
    if (online) {
      try {
        firebaseReachable = true;
      } catch (error) {
        firebaseReachable = false;
      }
    }
    
    return {
      online,
      firebaseReachable,
      pendingEntries
    };
  }

  static async saveEntryWithCallback(
    firestore: any,
    userId: string,
    saveFunction: () => Promise<any>,
    entryData: any,
    entryId?: string,
    onSuccess?: (result: { success: boolean; offline: boolean; entryId: string }) => void,
    onError?: (error: any) => void
  ): Promise<void> {
    try {
      const result = await this.saveWithOfflineSupport(
        firestore,
        userId,
        saveFunction,
        entryData,
        entryId
      );
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Error in saveEntryWithCallback:', error);
      
      try {
        const emergencyKey = `emergency_save_${Date.now()}`;
        localStorage.setItem(emergencyKey, JSON.stringify({
          data: entryData,
          entryId,
          timestamp: Date.now(),
          userId
        }));
        
        if (onSuccess) {
          onSuccess({
            success: true,
            offline: true,
            entryId: emergencyKey
          });
        }
      } catch (emergencyError) {
        if (onError) {
          onError(error);
        }
      }
    }
  }
}