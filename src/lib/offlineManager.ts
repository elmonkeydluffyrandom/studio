// src/lib/offlineManager.ts

export const OFFLINE_QUEUE_KEY = 'journal_offline_queue';
export const OFFLINE_ENTRIES_KEY = 'journal_offline_entries';

// Guardar en cola offline
export const addToOfflineQueue = (item: any) => {
  try {
    const queue = getOfflineQueue();
    queue.push({
      ...item,
      timestamp: Date.now(),
      attempts: 0
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (error) {
    console.error("Error adding to offline queue:", error);
    return false;
  }
};

// Obtener cola offline
export const getOfflineQueue = (): any[] => {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error("Error getting offline queue:", error);
    return [];
  }
};

// Limpiar cola offline
export const clearOfflineQueue = () => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

// Guardar entrada en localStorage
export const saveEntryOffline = (entryId: string | null, data: any, type: 'create' | 'update') => {
  try {
    const entries = getOfflineEntries();
    const key = entryId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    entries[key] = {
      data,
      type,
      timestamp: Date.now(),
      synced: false,
      entryId: entryId || key
    };
    
    localStorage.setItem(OFFLINE_ENTRIES_KEY, JSON.stringify(entries));
    return key;
  } catch (error) {
    console.error("Error saving entry offline:", error);
    return null;
  }
};

// Obtener entradas offline
export const getOfflineEntries = (): Record<string, any> => {
  try {
    const entries = localStorage.getItem(OFFLINE_ENTRIES_KEY);
    return entries ? JSON.parse(entries) : {};
  } catch (error) {
    console.error("Error getting offline entries:", error);
    return {};
  }
};

// Marcar entrada como sincronizada
export const markEntryAsSynced = (key: string) => {
  try {
    const entries = getOfflineEntries();
    if (entries[key]) {
      entries[key].synced = true;
      entries[key].syncedAt = Date.now();
      localStorage.setItem(OFFLINE_ENTRIES_KEY, JSON.stringify(entries));
    }
  } catch (error) {
    console.error("Error marking entry as synced:", error);
  }
};

// Verificar si hay datos offline pendientes
export const hasPendingOfflineData = (): boolean => {
  const queue = getOfflineQueue();
  const entries = getOfflineEntries();
  
  if (queue.length > 0) return true;
  
  const unsyncedEntries = Object.values(entries).filter((entry: any) => !entry.synced);
  return unsyncedEntries.length > 0;
};

// Sincronizar datos offline con Firebase
export const syncOfflineData = async (
  firestore: any, 
  userId: string, 
  onProgress?: (progress: number, total: number) => void
) => {
  const queue = getOfflineQueue();
  const entries = getOfflineEntries();
  
  if (queue.length === 0 && Object.keys(entries).length === 0) {
    return { success: true, synced: 0 };
  }
  
  let syncedCount = 0;
  const totalItems = queue.length + Object.keys(entries).length;
  
  // Importar dinámicamente para evitar errores de SSR
  const { doc, setDoc, addDoc, collection, Timestamp } = await import('firebase/firestore');
  
  try {
    // Sincronizar cola primero
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      
      try {
        if (item.type === 'update' && item.entryId) {
          const entryRef = doc(firestore, 'users', userId, 'journalEntries', item.entryId);
          await setDoc(entryRef, {
            ...item.data,
            updatedAt: Timestamp.now(),
            _offlineSynced: true,
            _lastSync: Timestamp.now()
          }, { merge: true });
        } else if (item.type === 'create') {
          const entriesCollection = collection(firestore, 'users', userId, 'journalEntries');
          await addDoc(entriesCollection, {
            ...item.data,
            createdAt: Timestamp.now(),
            _offlineSynced: true,
            _createdOffline: true,
            _lastSync: Timestamp.now()
          });
        }
        
        syncedCount++;
        if (onProgress) onProgress(syncedCount, totalItems);
        
      } catch (error) {
        console.error(`Error syncing queue item ${i}:`, error);
      }
    }
    
    // Sincronizar entradas guardadas
    const entryKeys = Object.keys(entries);
    for (let i = 0; i < entryKeys.length; i++) {
      const key = entryKeys[i];
      const entry = entries[key];
      
      if (entry.synced) continue;
      
      try {
        if (entry.type === 'update' && entry.entryId) {
          const entryRef = doc(firestore, 'users', userId, 'journalEntries', entry.entryId);
          await setDoc(entryRef, {
            ...entry.data,
            updatedAt: Timestamp.now(),
            _offlineSynced: true,
            _lastSync: Timestamp.now()
          }, { merge: true });
        } else if (entry.type === 'create') {
          const entriesCollection = collection(firestore, 'users', userId, 'journalEntries');
          await addDoc(entriesCollection, {
            ...entry.data,
            createdAt: Timestamp.now(),
            _offlineSynced: true,
            _createdOffline: true,
            _lastSync: Timestamp.now()
          });
        }
        
        markEntryAsSynced(key);
        syncedCount++;
        if (onProgress) onProgress(syncedCount, totalItems);
        
      } catch (error) {
        console.error(`Error syncing entry ${key}:`, error);
      }
    }
    
    // Limpiar cola sincronizada
    clearOfflineQueue();
    
    return {
      success: true,
      synced: syncedCount,
      total: totalItems
    };
    
  } catch (error) {
    console.error("Error in syncOfflineData:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      synced: syncedCount,
      total: totalItems
    };
  }
};